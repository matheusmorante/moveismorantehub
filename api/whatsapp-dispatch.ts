import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseSecretKey, getSupabaseUrl } from './supabaseSecretKey.js';

const GRAPH_VERSION = 'v26.0';
export const MAX_WHATSAPP_TEST_REQUEST_BYTES = 16_000;
const CARE_WINDOW_MS = 24 * 60 * 60 * 1000;

function developmentSandbox(env: NodeJS.ProcessEnv) {
  const phoneNumberId = env.WHATSAPP_TEST_PHONE_NUMBER_ID?.trim() || '';
  const wabaId = env.WHATSAPP_TEST_WABA_ID?.trim() || '';
  const phoneNumber = env.WHATSAPP_TEST_PHONE_NUMBER?.trim() || '';
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  const enabled = env.VERCEL_ENV === 'development'
    && env.MORANTE_ENV_SOURCE === 'vercel-development'
    && /^\d{1,32}$/.test(phoneNumberId)
    && /^\d{1,32}$/.test(wabaId)
    && /^\+[1-9]\d{7,14}$/.test(phoneNumber)
    && Boolean(accessToken);

  return { enabled, phoneNumberId, phoneNumber, accessToken };
}

function jsonSize(value: unknown): number {
  try { return Buffer.byteLength(JSON.stringify(value ?? {}), 'utf8'); }
  catch { return MAX_WHATSAPP_TEST_REQUEST_BYTES + 1; }
}

function bearerToken(req: VercelRequest): string {
  const header = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  return /^Bearer\s+(\S+)$/i.exec(String(header || ''))?.[1] || '';
}

function numericPhone(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface WhatsAppTestDispatchDependencies {
  env?: NodeJS.ProcessEnv;
  createClient?: typeof createClient;
  fetchMeta?: typeof fetch;
}

export function createWhatsAppTestDispatchHandler(dependencies: WhatsAppTestDispatchDependencies = {}) {
  const env = dependencies.env || process.env;
  const createSupabaseClient = dependencies.createClient || createClient;
  const fetchMeta = dependencies.fetchMeta || ((input, init) => globalThis.fetch(input, init));

  return async function handler(req: VercelRequest, res: VercelResponse) {
  const sandbox = developmentSandbox(env);

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      enabled: sandbox.enabled,
      ...(sandbox.enabled ? { phoneNumberId: sandbox.phoneNumberId, phoneNumber: sandbox.phoneNumber } : {}),
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!sandbox.enabled) {
    return res.status(403).json({
      error: 'Envio indisponível por política da empresa.',
      status: 'BLOCKED_FREE_TIER_PROTECTION',
      reason: 'O envio de teste só fica disponível no Development com o remetente sandbox configurado.',
    });
  }
  if (jsonSize(req.body) > MAX_WHATSAPP_TEST_REQUEST_BYTES) return res.status(413).json({ error: 'Solicitação excede o tamanho permitido.' });

  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });

  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim() || getSupabaseUrl();
  const anonKey = env.SUPABASE_ANON_KEY?.trim() || env.VITE_SUPABASE_ANON_KEY?.trim() || '';
  const serviceKey = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || env.SUPABASE_SERVICE_KEY?.trim() || env.service_role?.trim() || getSupabaseSecretKey();
  if (!supabaseUrl || !anonKey || !serviceKey) return res.status(503).json({ error: 'Serviço de atendimento indisponível.' });

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
  const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) {
    return res.status(400).json({ error: 'Conversa inválida.' });
  }
  if (!message || message.length > 4096) return res.status(400).json({ error: 'A mensagem deve ter entre 1 e 4096 caracteres.' });

  const userDb = createSupabaseClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  let authResult: Awaited<ReturnType<typeof userDb.auth.getUser>>;
  try { authResult = await withTimeout(userDb.auth.getUser(token), 12_000); }
  catch { return res.status(503).json({ error: 'Não foi possível validar a sessão.' }); }
  const { data: auth, error: authError } = authResult;
  if (authError || !auth.user?.id) return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });

  let permissionResult: Awaited<ReturnType<typeof userDb.rpc>>;
  try { permissionResult = await withTimeout(userDb.rpc('customer_support_can_view'), 12_000); }
  catch { return res.status(503).json({ error: 'Não foi possível validar o acesso à Central.' }); }
  const { data: canView, error: permissionError } = permissionResult;
  if (permissionError) return res.status(503).json({ error: 'Não foi possível validar o acesso à Central.' });
  if (canView !== true) return res.status(403).json({ error: 'Sem permissão para enviar mensagens pela Central.' });

  let conversationResult: { data: Record<string, any> | null; error: unknown };
  try {
    conversationResult = await withTimeout(userDb
      .from('whatsapp_conversations')
      .select('id,business_phone_number_id,contact_phone,last_customer_message_at')
      .eq('id', conversationId)
      .maybeSingle(), 12_000);
  } catch { return res.status(503).json({ error: 'Não foi possível validar a conversa.' }); }
  const { data: conversation, error: conversationError } = conversationResult;
  if (conversationError) return res.status(503).json({ error: 'Não foi possível validar a conversa.' });
  if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada.' });
  if (conversation.business_phone_number_id !== sandbox.phoneNumberId) {
    return res.status(403).json({ error: 'A Central só envia neste fluxo para conversas do número de teste Meta.' });
  }

  const lastCustomerMessageAt = Date.parse(String(conversation.last_customer_message_at || ''));
  const elapsed = Date.now() - lastCustomerMessageAt;
  if (!Number.isFinite(lastCustomerMessageAt) || elapsed < 0 || elapsed >= CARE_WINDOW_MS) {
    return res.status(403).json({ error: 'A janela de atendimento de 24 horas está fechada. Envie uma mensagem ao número de teste para abri-la.' });
  }

  const recipient = numericPhone(conversation.contact_phone);
  if (!/^\d{10,15}$/.test(recipient)) return res.status(400).json({ error: 'O telefone da conversa é inválido.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  let graphData: Record<string, any> = {};
  try {
    const graphResponse = await fetchMeta(`https://graph.facebook.com/${GRAPH_VERSION}/${sandbox.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sandbox.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { body: message },
      }),
      signal: controller.signal,
    });
    graphData = await graphResponse.json().catch(() => ({}));
    if (!graphResponse.ok) {
      const code = Number(graphData.error?.code);
      if (code === 131030) {
        return res.status(422).json({ error: 'Este telefone não está autorizado como destinatário de teste no app Meta.' });
      }
      if (code === 131047) {
        return res.status(422).json({ error: 'A janela de atendimento expirou; o remetente de teste exige uma conversa aberta.' });
      }
      return res.status(502).json({ error: `A Meta recusou a mensagem${Number.isFinite(code) ? ` (código ${code})` : ''}.` });
    }
  } catch {
    return res.status(controller.signal.aborted ? 504 : 502).json({
      error: 'Resultado do envio incerto. Atualize a conversa antes de tentar novamente.',
      outcomeUncertain: true,
    });
  } finally {
    clearTimeout(timeout);
  }

  const apiMessageId = typeof graphData.messages?.[0]?.id === 'string' ? graphData.messages[0].id : '';
  if (!apiMessageId) {
    return res.status(502).json({ error: 'A Meta não confirmou o identificador da mensagem.' });
  }

  const sentAt = new Date().toISOString();
  const authorName = String(auth.user.user_metadata?.full_name || auth.user.email || 'Atendente').slice(0, 100);
  try {
    const adminDb = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: messageError } = await withTimeout(adminDb.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      api_message_id: apiMessageId,
      direction: 'outbound',
      message_type: 'text',
      text_content: message,
      status: 'sent',
      raw_payload: { author_id: auth.user.id, author_name: authorName, test_sender: true },
      timestamp: sentAt,
    }), 12_000);
    if (messageError) throw new Error('message persistence failed');

    await withTimeout(adminDb.from('whatsapp_conversations').update({
      last_message_text: message,
      last_message_at: sentAt,
      updated_at: sentAt,
    }).eq('id', conversationId), 12_000);
  } catch {
    return res.status(200).json({
      accepted: true,
      persisted: false,
      warning: 'A Meta aceitou a mensagem, mas a Central não conseguiu atualizar o histórico. Não a reenvie; atualize a conversa.',
    });
  }

  return res.status(200).json({ accepted: true, persisted: true, apiMessageId });
  };
}

export default createWhatsAppTestDispatchHandler();
