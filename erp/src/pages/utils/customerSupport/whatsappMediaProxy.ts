import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface MediaProxyConfiguration {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseSecretKey?: string;
}

/** Shared by the standalone endpoint and the consolidated ERP webhook route. */
export async function handleWhatsAppMedia(
  req: VercelRequest,
  res: VercelResponse,
  configuration: MediaProxyConfiguration,
) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  const authorization = req.headers.authorization;
  const token = typeof authorization === 'string' && /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
  if (!token) return res.status(401).json({ error: 'Entre novamente para consultar a mídia.' });

  const mediaId = req.query.id;
  if (typeof mediaId !== 'string' || !/^\d+$/.test(mediaId)) {
    return res.status(400).json({ error: 'Identificador de mídia inválido.' });
  }
  if (!configuration.supabaseUrl || !configuration.supabaseAnonKey) {
    return res.status(503).json({ error: 'Consulta de mídia indisponível no servidor.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  const boundedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: controller.signal });
  try {
    // The caller's JWT and public key keep the message lookup subject to RLS.
    const userDb = createClient(configuration.supabaseUrl, configuration.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: boundedFetch },
    });
    const { data: auth, error: authError } = await userDb.auth.getUser(token);
    if (authError || !auth.user?.id) return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });
    const { data: canView, error: permissionError } = await userDb.rpc('customer_support_can_view');
    if (permissionError) return res.status(503).json({ error: 'Não foi possível validar o acesso à Central.' });
    if (canView !== true) return res.status(403).json({ error: 'Sem permissão para acessar a Central.' });

    const { data: message, error: messageError } = await userDb.from('whatsapp_messages')
      .select('id, conversation_id').eq('media_id', mediaId).limit(1).maybeSingle();
    if (messageError) return res.status(503).json({ error: 'Não foi possível consultar a mídia.' });
    if (!message) return res.status(404).json({ error: 'Mídia não encontrada na Central.' });

    let metaToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
    if (!metaToken && configuration.supabaseSecretKey) {
      const { data: conversation, error: conversationError } = await userDb.from('whatsapp_conversations')
        .select('business_phone_number_id').eq('id', message.conversation_id).maybeSingle();
      if (conversationError || !conversation?.business_phone_number_id) {
        return res.status(503).json({ error: 'Não foi possível validar o canal da mídia.' });
      }
      // Read only this integration's configuration, on the server, after the caller's RLS lookup.
      const configDb = createClient(configuration.supabaseUrl, configuration.supabaseSecretKey, {
        auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: boundedFetch },
      });
      const { data: settings, error: settingsError } = await configDb.from('settings')
        .select('data->whatsappConfig').eq('id', 'app').maybeSingle();
      const channel = settings?.whatsappConfig;
      if (settingsError || !channel || typeof channel !== 'object' || Array.isArray(channel)
        || channel.phoneNumberId !== conversation.business_phone_number_id
        || typeof channel.accessToken !== 'string' || !channel.accessToken.trim()) {
        return res.status(503).json({ error: 'O canal da mídia não está configurado no servidor.' });
      }
      metaToken = channel.accessToken.trim();
    }
    if (!metaToken) return res.status(503).json({ error: 'Consulta de mídia indisponível na Meta.' });
    const metaResponse = await boundedFetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${metaToken}` },
    });
    if (!metaResponse.ok) return res.status(502).json({ error: 'Não foi possível consultar a mídia na Meta.' });
    const metadata = await metaResponse.json();
    if (!metadata.url) return res.status(404).json({ error: 'Arquivo indisponível na Meta.' });
    const downloadUrl = new URL(metadata.url);
    if (downloadUrl.protocol !== 'https:') throw new Error('Invalid media download protocol');
    const file = await boundedFetch(downloadUrl, { headers: { Authorization: `Bearer ${metaToken}` } });
    if (!file.ok) return res.status(502).json({ error: 'Não foi possível baixar o arquivo da Meta.' });
    const buffer = Buffer.from(await file.arrayBuffer());
    res.setHeader('Content-Type', metadata.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length.toString());
    return res.status(200).send(buffer);
  } catch {
    return res.status(controller.signal.aborted ? 504 : 502).json({
      error: controller.signal.aborted ? 'A consulta da mídia demorou demais. Tente novamente.' : 'Não foi possível carregar a mídia.',
    });
  } finally {
    clearTimeout(timer);
  }
}
