import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'morante_hub_whatsapp_2026';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

export function verifyMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!appSecret || appSecret.trim() === '') {
    return true; // Sem segredo configurado em ambiente de teste/dev, não rejeita
  }
  if (!signatureHeader) return false;

  const parts = signatureHeader.split('=');
  const signatureHex = parts.length === 2 ? parts[1] : parts[0];
  if (!signatureHex) return false;

  try {
    const expectedHex = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signatureHex, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');

    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch (err) {
    console.error('[WhatsApp Webhook] Erro na verificação de assinatura:', err);
    return false;
  }
}

export function parseMetaStatusFailure(errors?: any[]): {
  failureReason: string | null;
  errorCode: string | null;
} {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return { failureReason: null, errorCode: null };
  }
  const first = errors[0] || {};
  const code = String(first.code || '');
  const details = first.error_data?.details || first.message || first.title || '';

  let friendly = '';
  if (code === '131056') {
    friendly =
      'Mensagem descartada pela Meta (proteção anti-spam ou envio repetido). Aguarde 1 minuto ou altere o conteúdo do pedido antes de reenviar.';
  } else if (code === '131049') {
    friendly = 'Disparo bloqueado por restrições de integridade ou política da Meta.';
  } else if (code === '131047') {
    friendly = 'Janela de 24h fechada. É obrigatório o uso de modelo de mensagem aprovado.';
  } else if (code === '131026') {
    friendly = 'Número não encontrado ou incapaz de receber mensagens no WhatsApp.';
  } else if (code === '130429') {
    friendly = 'Limite temporário de taxa de envio atingido na Meta Cloud API. Aguarde alguns instantes.';
  } else {
    friendly = first.title || first.message || `Falha reportada pela Meta (Código #${code})`;
  }

  if (details && !friendly.includes(details)) {
    friendly += ` Detalhes: ${details}`;
  }

  return { failureReason: friendly, errorCode: code || null };
}

function normalizeE164(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return `+${digits}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature-256');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const operation = req.query.operation as string | undefined;

  // A. Operação DISPATCH (Bloqueio Categórico no Backend para Prevenção de Custos da Meta)
  if (operation === 'dispatch') {
    return res.status(403).json({
      error: 'Envio indisponível. Central em modo de visualização gratuita.',
      status: 'BLOCKED_FREE_TIER_PROTECTION',
      reason:
        'O módulo Central de Atendimento opera exclusivamente em modo de visualização e recebimento para impedir qualquer risco de cobrança da Meta.',
    });
  }

  // B. Operação MEDIA (Proxy seguro para download de mídias sem expor o token da Meta)
  if (operation === 'media') {
    const mediaId = req.query.id as string | undefined;
    if (!mediaId) {
      return res.status(400).json({ error: 'Parâmetro "id" de mídia obrigatório.' });
    }

    const accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      process.env.WHATSAPP_TOKEN;

    if (!accessToken) {
      return res.status(500).json({ error: 'Token da WhatsApp Cloud API não configurado.' });
    }

    try {
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!metaRes.ok) {
        return res.status(metaRes.status).json({ error: 'Mídia não encontrada na Meta.' });
      }
      const metaData = await metaRes.json();
      const downloadUrl = metaData.url;
      const mimeType = metaData.mime_type || 'application/octet-stream';

      if (!downloadUrl) {
        return res.status(404).json({ error: 'URL da mídia indisponível na Meta.' });
      }

      const fileRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!fileRes.ok) {
        return res.status(fileRes.status).json({ error: 'Falha ao baixar mídia dos servidores Meta.' });
      }

      const arrayBuffer = await fileRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.status(200).send(buffer);
    } catch (err: any) {
      console.error('[WhatsApp Media Proxy] Erro:', err);
      return res.status(500).json({ error: err.message || 'Erro ao processar mídia.' });
    }
  }

  // C. Verificação do Webhook pela Meta (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Verificação da Meta bem-sucedida! Challenge retornado.');
      return res.status(200).send(challenge);
    } else {
      console.warn('[WhatsApp Webhook] Token de verificação inválido:', { mode, token });
      return res.status(403).json({ error: 'Verify token mismatch' });
    }
  }

  // D. Recebimento de Mensagens e Status (POST)
  if (req.method === 'POST') {
    try {
      const rawBody =
        typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);

      const sigHeader = (req.headers['x-hub-signature-256'] ||
        req.headers['X-Hub-Signature-256']) as string | undefined;

      if (!verifyMetaSignature(rawBody, sigHeader, APP_SECRET)) {
        console.warn('[WhatsApp Webhook] Assinatura X-Hub-Signature-256 rejeitada.');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const body = req.body;
      const entries = body?.entry || [];

      console.log(`[WhatsApp Webhook] Recebidas ${entries.length} entradas da Meta.`);

      if (!supabaseServiceKey) {
        console.error('[WhatsApp Webhook] Supabase Service Key não configurada.');
        return res.status(500).json({ error: 'Supabase configuration missing' });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      for (const entry of entries) {
        for (const change of entry?.changes || []) {
          const value = change?.value;
          if (!value) continue;

          const businessPhoneNumberId = String(value.metadata?.phone_number_id || '');

          // Processa mensagens
          if (value.messages && Array.isArray(value.messages)) {
            for (const message of value.messages) {
              const msgId = message.id;
              const from = String(message.from || '');
              if (!msgId || !from) continue;

              // Confirmação de entrega por botão interativo (PRESERVADA)
              if (message.type === 'interactive' && message.interactive?.button_reply) {
                const buttonId = message.interactive.button_reply.id;
                const buttonTitle = message.interactive.button_reply.title;
                console.log(`[WhatsApp Webhook] Botão interativo clicado: ${buttonId} (${buttonTitle})`);

                if (buttonId.startsWith('confirm_delivery_')) {
                  const orderId = buttonId.replace('confirm_delivery_', '');
                  console.log(`[WhatsApp Webhook] Confirmando entrega para pedido #${orderId}`);
                  await supabase
                    .from('orders')
                    .update({
                      delivery_confirmed_at: new Date().toISOString(),
                      delivery_confirmed_by: from,
                    })
                    .eq('id', orderId);
                }
              }

              // Deduplicação estrita na Central de Atendimento
              const { data: existing } = await supabase
                .from('whatsapp_messages')
                .select('id')
                .eq('api_message_id', msgId)
                .maybeSingle();

              if (existing) {
                console.log(`[WhatsApp Webhook] Mensagem #${msgId} já processada anteriormente (idempotência).`);
                continue;
              }

              const contactName =
                value.contacts?.find((c: any) => c.wa_id === from)?.profile?.name ||
                value.contacts?.[0]?.profile?.name ||
                null;

              const contactPhoneE164 = normalizeE164(from);
              const messageTimestamp = message.timestamp
                ? new Date(Number(message.timestamp) * 1000).toISOString()
                : new Date().toISOString();

              // Busca conversa existente
              const { data: conv } = await supabase
                .from('whatsapp_conversations')
                .select('id, customer_id, customer_link_status, unread_count')
                .eq('business_phone_number_id', businessPhoneNumberId)
                .eq('contact_wa_id', from)
                .maybeSingle();

              let convId = conv?.id;
              let customerId = conv?.customer_id;
              let linkStatus = conv?.customer_link_status || 'unlinked';

              // Se cliente não vinculado, tenta match pelo telefone
              if (!customerId && linkStatus !== 'manually_linked') {
                const cleanFrom = from.replace(/\D/g, '');
                const cleanWithout55 = cleanFrom.startsWith('55') ? cleanFrom.slice(2) : cleanFrom;
                const searchFilters = [
                  `phone.ilike.%${cleanFrom}%`,
                  `phone.ilike.%${cleanWithout55}%`,
                ].join(',');

                const { data: people } = await supabase
                  .from('people')
                  .select('id, full_name, phone')
                  .or(searchFilters)
                  .or('deleted.is.null,deleted.eq.false')
                  .limit(10);

                if (people && people.length === 1) {
                  customerId = people[0].id;
                  linkStatus = 'auto_matched';
                } else if (people && people.length > 1) {
                  linkStatus = 'ambiguous';
                } else {
                  linkStatus = 'unlinked';
                }
              }

              // Determina texto e mídias
              let textContent = '';
              let mediaId: string | undefined;
              let mediaMimeType: string | undefined;
              let mediaFilename: string | undefined;
              let mediaCaption: string | undefined;
              const type = message.type || 'text';

              if (type === 'text') {
                textContent = message.text?.body || '';
              } else if (type === 'image') {
                textContent = message.image?.caption || '[Imagem]';
                mediaId = message.image?.id;
                mediaMimeType = message.image?.mime_type;
                mediaCaption = message.image?.caption;
              } else if (type === 'document') {
                textContent = message.document?.filename || message.document?.caption || '[Documento]';
                mediaId = message.document?.id;
                mediaMimeType = message.document?.mime_type;
                mediaFilename = message.document?.filename;
                mediaCaption = message.document?.caption;
              } else if (type === 'audio') {
                textContent = '[Áudio]';
                mediaId = message.audio?.id;
                mediaMimeType = message.audio?.mime_type;
              } else if (type === 'video') {
                textContent = message.video?.caption || '[Vídeo]';
                mediaId = message.video?.id;
                mediaMimeType = message.video?.mime_type;
                mediaCaption = message.video?.caption;
              } else if (type === 'interactive') {
                textContent = `🔘 ${message.interactive?.button_reply?.title || 'Resposta'}`;
              } else {
                textContent = `[Mensagem tipo ${type}]`;
              }

              if (!convId) {
                const { data: newConv } = await supabase
                  .from('whatsapp_conversations')
                  .insert({
                    business_phone_number_id: businessPhoneNumberId,
                    contact_phone: contactPhoneE164,
                    contact_wa_id: from,
                    contact_name: contactName,
                    customer_id: customerId,
                    customer_link_status: linkStatus,
                    last_message_text: textContent,
                    last_message_at: messageTimestamp,
                    last_customer_message_at: messageTimestamp,
                    unread_count: 1,
                    is_archived: false,
                  })
                  .select('id')
                  .single();
                convId = newConv?.id;
              } else {
                await supabase
                  .from('whatsapp_conversations')
                  .update({
                    contact_name: contactName || undefined,
                    customer_id: customerId || undefined,
                    customer_link_status: linkStatus,
                    last_message_text: textContent,
                    last_message_at: messageTimestamp,
                    last_customer_message_at: messageTimestamp,
                    unread_count: (conv?.unread_count || 0) + 1,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', convId);
              }

              if (convId) {
                await supabase.from('whatsapp_messages').insert({
                  conversation_id: convId,
                  api_message_id: msgId,
                  direction: 'inbound',
                  message_type: type,
                  text_content: textContent,
                  media_id: mediaId,
                  media_mime_type: mediaMimeType,
                  media_filename: mediaFilename,
                  media_caption: mediaCaption,
                  reply_to_wamid: message.context?.id,
                  status: 'received',
                  timestamp: messageTimestamp,
                });
              }
            }
          }

          // Processa status de entrega
          if (value.statuses && Array.isArray(value.statuses)) {
            for (const statusItem of value.statuses) {
              const msgId = statusItem.id;
              const rawStatus = String(statusItem.status || '').toLowerCase();
              const deliveryStatus =
                rawStatus === 'failed'
                  ? 'failed'
                  : rawStatus === 'read'
                    ? 'read'
                    : rawStatus === 'delivered'
                      ? 'delivered'
                      : 'sent';

              const updatedAt = statusItem.timestamp
                ? new Date(Number(statusItem.timestamp) * 1000).toISOString()
                : new Date().toISOString();

              const { failureReason, errorCode } = parseMetaStatusFailure(statusItem.errors);

              // Atualiza whatsapp_dispatches
              await supabase
                .from('whatsapp_dispatches')
                .update({
                  status: deliveryStatus,
                  updated_at: updatedAt,
                  ...(failureReason ? { failure_reason: failureReason } : {}),
                  ...(errorCode ? { error_code: errorCode } : {}),
                  raw_payload: statusItem,
                })
                .eq('api_message_id', msgId);

              // Atualiza warranty_terms
              await supabase
                .from('warranty_terms')
                .update({
                  delivery_status: deliveryStatus,
                  delivery_status_updated_at: updatedAt,
                  ...(failureReason ? { failure_reason: failureReason } : {}),
                })
                .eq('api_message_id', msgId);

              // Atualiza whatsapp_messages
              await supabase
                .from('whatsapp_messages')
                .update({
                  status: deliveryStatus,
                  ...(failureReason ? { failure_reason: failureReason } : {}),
                  ...(errorCode ? { error_code: errorCode } : {}),
                })
                .eq('api_message_id', msgId);
            }
          }
        }
      }

      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (error: any) {
      console.error('[WhatsApp Webhook] Erro ao processar payload:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
