import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateErpRequest, hasErpPermission } from '../erp/api/_lib/authenticatedErpRequest.js';
import { getSupabaseSecretKey } from './supabaseSecretKey.js';
import { UUID_PATTERN } from './whatsappSupportSendRequest.js';

const withTimeout = async <T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const responseJson = (res: VercelResponse, status: number, body: Record<string, unknown>) =>
  res.status(status).json(body);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return responseJson(res, 405, { error: 'Método não permitido.' });

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 32_000) return responseJson(res, 413, { error: 'Solicitação excede o tamanho permitido.' });
    try { body = JSON.parse(body); } catch { return responseJson(res, 400, { error: 'Solicitação inválida.' }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return responseJson(res, 400, { error: 'Solicitação inválida.' });
  }

  const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
  const messageIds = Array.isArray(body.messageIds) ? body.messageIds : [];
  if (!UUID_PATTERN.test(conversationId) || messageIds.length < 1 || messageIds.length > 100
    || messageIds.some((id: unknown) => typeof id !== 'string' || !UUID_PATTERN.test(id))) {
    return responseJson(res, 400, { error: 'Seleção de mensagens inválida.' });
  }
  const uniqueIds = [...new Set(messageIds as string[])];
  if (uniqueIds.length !== messageIds.length) return responseJson(res, 400, { error: 'A seleção contém mensagens repetidas.' });

  const context = await authenticateErpRequest(req, res).catch(() => null);
  if (!context) return;
  if (!hasErpPermission(context, 'viewCustomerSupport')) {
    return responseJson(res, 403, { error: 'Você não tem acesso à Central de Atendimento.' });
  }

  try {
    const permission = await withTimeout(context.userDb.rpc('customer_support_can_view'), 12_000);
    if (permission.error) return responseJson(res, 503, { error: 'Não foi possível validar o acesso à Central.' });
    if (permission.data !== true) return responseJson(res, 403, { error: 'Sem permissão para usar a Central de Atendimento.' });

    const conversationResult = await withTimeout(context.userDb
      .from('whatsapp_conversations')
      .select('id,last_message_at')
      .eq('id', conversationId)
      .maybeSingle(), 12_000);
    if (conversationResult.error) return responseJson(res, 503, { error: 'Não foi possível validar a conversa.' });
    if (!conversationResult.data) return responseJson(res, 404, { error: 'Conversa não encontrada.' });

    const selectedResult = await withTimeout(context.userDb
      .from('whatsapp_messages')
      .select('id,message_type,raw_payload,timestamp')
      .eq('conversation_id', conversationId)
      .in('id', uniqueIds), 12_000);
    if (selectedResult.error) return responseJson(res, 503, { error: 'Não foi possível validar as mensagens.' });
    const selectedRows = selectedResult.data || [];
    if (selectedRows.length !== uniqueIds.length) return responseJson(res, 404, { error: 'Uma ou mais mensagens não pertencem a esta conversa.' });

    const isRemovable = (row: { message_type?: unknown; raw_payload?: unknown }) => {
      const type = String(row.message_type || '');
      const providerType = row.raw_payload && typeof row.raw_payload === 'object'
        ? String((row.raw_payload as Record<string, unknown>).provider_message_type || '')
        : '';
      return !['deleted', 'internal_note', 'system_event'].includes(type)
        && !['reaction', 'system', 'request_welcome'].includes(providerType);
    };
    if (selectedRows.some((row: { message_type?: unknown; raw_payload?: unknown }) => !isRemovable(row))) {
      return responseJson(res, 400, { error: 'A seleção inclui uma mensagem que não pode ser removida.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || '';
    const supabaseSecret = getSupabaseSecretKey();
    if (!supabaseUrl || !supabaseSecret) return responseJson(res, 503, { error: 'Serviço de remoção indisponível.' });
    const adminDb = createClient(supabaseUrl, supabaseSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const deletedAt = new Date().toISOString();
    const updateResult = await withTimeout(adminDb.from('whatsapp_messages').update({
      message_type: 'deleted',
      text_content: 'Mensagem removida da Central. Ela continua no WhatsApp.',
      media_id: null,
      media_mime_type: null,
      media_url: null,
      media_filename: null,
      media_caption: null,
      reply_to_message_id: null,
      reply_to_wamid: null,
      raw_payload: {
        deleted_in_central: true,
        deleted_at: deletedAt,
        deleted_by: context.userId,
      },
    })
      .eq('conversation_id', conversationId)
      .in('id', uniqueIds)
      .neq('message_type', 'deleted')
      .select('id'), 12_000);
    if (updateResult.error) return responseJson(res, 503, { error: 'Não foi possível remover as mensagens da Central.' });
    const deletedCount = updateResult.data?.length || 0;
    if (!deletedCount) return responseJson(res, 409, { error: 'As mensagens já foram removidas. Atualize a conversa.' });

    const lastMessageAt = conversationResult.data.last_message_at;
    const removedLatestMessage = selectedRows.some((row: { timestamp?: string }) =>
      lastMessageAt && row.timestamp && Date.parse(row.timestamp) >= Date.parse(lastMessageAt));
    if (removedLatestMessage) {
      const latestResult = await withTimeout(adminDb.from('whatsapp_messages')
        .select('message_type,text_content,media_caption,timestamp')
        .eq('conversation_id', conversationId)
        .not('message_type', 'in', '(deleted,internal_note,system_event)')
        .order('timestamp', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(), 12_000);
      if (!latestResult.error) {
        const latest = latestResult.data;
        const labels: Record<string, string> = {
          image: 'Foto', video: 'Vídeo', audio: 'Áudio', document: 'Documento',
          sticker: 'Figurinha', location: 'Localização', contacts: 'Contato',
        };
        const preview = latest
          ? String(latest.text_content || latest.media_caption || labels[latest.message_type] || 'Mensagem')
          : 'Mensagem removida da Central';
        let conversationUpdate = adminDb.from('whatsapp_conversations')
          .update({ last_message_text: preview })
          .eq('id', conversationId);
        if (lastMessageAt) conversationUpdate = conversationUpdate.eq('last_message_at', lastMessageAt);
        await withTimeout(conversationUpdate, 12_000).catch(() => null);
      }
    }

    return responseJson(res, 200, { removedCount: Math.min(deletedCount, uniqueIds.length), whatsappDeletionSupported: false });
  } catch {
    return responseJson(res, 503, { error: 'Não foi possível remover as mensagens. Tente novamente.' });
  }
}
