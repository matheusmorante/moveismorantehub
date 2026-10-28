import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractDigits, normalizeToE164 } from './phoneUtils.js';
import { matchCustomerByPhone } from './customerMatchingService.js';

export interface WebhookProcessResult {
  processedMessages: number;
  processedStatuses: number;
  deliveryConfirmations: number;
  duplicatesIgnored: number;
  errors: string[];
}

export function parseMetaStatusFailure(errors?: any[]): {
  failureReason: string | null;
  errorCode: string | null;
} {
  if (!Array.isArray(errors) || errors.length === 0) return { failureReason: null, errorCode: null };
  const first = errors[0] || {};
  const code = String(first.code || '');
  const details = first.error_data?.details || first.message || first.title || '';
  let failureReason: string;
  if (code === '131056') {
    failureReason = 'Mensagem descartada pela Meta (proteção anti-spam ou envio repetido). Aguarde 1 minuto ou altere o conteúdo do pedido antes de reenviar.';
  } else if (code === '131049') {
    failureReason = 'Disparo bloqueado por restrições de integridade ou política da Meta.';
  } else if (code === '131047') {
    failureReason = 'Janela de 24h fechada. É obrigatório o uso de modelo de mensagem aprovado.';
  } else if (code === '131026') {
    failureReason = 'Número não encontrado ou incapaz de receber mensagens no WhatsApp.';
  } else if (code === '130429') {
    failureReason = 'Limite temporário de taxa de envio atingido na Meta Cloud API. Aguarde alguns instantes.';
  } else {
    failureReason = first.title || first.message || `Falha reportada pela Meta (Código #${code})`;
  }
  if (details && !failureReason.includes(details)) failureReason += ` Detalhes: ${details}`;
  return { failureReason, errorCode: code || null };
}

/**
 * Valida a assinatura HMAC SHA-256 enviada no cabeçalho X-Hub-Signature-256
 */
export function verifyMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!appSecret || appSecret.trim() === '') {
    return false;
  }
  if (!signatureHeader) return false;

  const signatureMatch = /^sha256=([a-f0-9]{64})$/i.exec(signatureHeader.trim());
  const signatureHex = signatureMatch?.[1];
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
    console.error('[verifyMetaSignature] Erro ao validar assinatura:', err);
    return false;
  }
}

export async function readRawWebhookBody(request: AsyncIterable<Buffer | string> & { rawBody?: Buffer }): Promise<Buffer> {
  if (Buffer.isBuffer(request.rawBody)) return request.rawBody;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function processRevokedMessage(
  supabase: SupabaseClient,
  businessPhoneNumberId: string,
  contactWaId: string,
  message: any,
  direction: 'inbound' | 'outbound',
): Promise<boolean | null> {
  const originalMessageId = String(message?.revoke?.original_message_id || '').trim();
  if (!originalMessageId) throw new Error('Revogação do WhatsApp sem o ID da mensagem original.');

  const timestamp = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const { data, error } = await supabase.rpc('customer_support_revoke_message', {
    p_business_phone_number_id: businessPhoneNumberId,
    p_contact_wa_id: contactWaId,
    p_original_message_id: originalMessageId,
    p_direction: direction,
    p_timestamp: timestamp,
  });
  if (error) throw error;
  if (!data || data.handled !== true || typeof data.found !== 'boolean' || typeof data.changed !== 'boolean') {
    throw new Error('Revogação da mensagem não confirmada pelo servidor.');
  }
  if (!data.found) return null;
  return data.changed;
}

async function processBusinessAppEcho(
  supabase: SupabaseClient,
  businessPhoneNumberId: string,
  value: any,
  message: any,
): Promise<boolean | null> {
  const contactWaId = extractDigits(String(message?.to || ''));
  if (contactWaId.length < 8 || contactWaId.length > 15) return null;
  if (message?.type === 'revoke') {
    return processRevokedMessage(supabase, businessPhoneNumberId, contactWaId, message, 'outbound');
  }

  const wamid = String(message?.id || '');
  if (!wamid) return null;

  const { data: existingMessage, error: duplicateError } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('api_message_id', wamid)
    .maybeSingle();
  if (duplicateError) throw duplicateError;

  let matchedCustomerId: string | null = null;
  let customerLinkStatus = 'unlinked';
  if (!existingMessage) {
    const { data: conversation, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select('id, customer_id, customer_link_status')
      .eq('business_phone_number_id', businessPhoneNumberId)
      .eq('contact_wa_id', contactWaId)
      .maybeSingle();
    if (conversationError) throw conversationError;

    if (!conversation?.customer_id && conversation?.customer_link_status !== 'manually_linked') {
      const matchResult = await matchCustomerByPhone(supabase, contactWaId);
      if (matchResult.status === 'auto_matched' && matchResult.customer) {
        matchedCustomerId = matchResult.customer.id;
        customerLinkStatus = 'auto_matched';
      } else if (matchResult.status === 'ambiguous') {
        customerLinkStatus = 'ambiguous';
      }
    }
  }

  const extracted = extractMessageContent(message);
  const timestamp = message.timestamp
    ? new Date(Number(message.timestamp) * 1000).toISOString()
    : new Date().toISOString();
  const profile = value.contacts?.find((contact: any) => extractDigits(contact?.wa_id) === contactWaId)?.profile?.name;
  const { data: receipt, error: receiptError } = await supabase.rpc('customer_support_receive_message_echo', {
    p_business_phone_number_id: businessPhoneNumberId,
    p_contact_wa_id: contactWaId,
    p_contact_phone: normalizeToE164(contactWaId),
    p_contact_name: profile || null,
    p_customer_id: matchedCustomerId,
    p_customer_link_status: customerLinkStatus,
    p_message: {
      api_message_id: wamid,
      message_type: extracted.type,
      text_content: extracted.text,
      media_id: extracted.mediaId ?? null,
      media_mime_type: extracted.mediaMimeType ?? null,
      media_filename: extracted.mediaFilename ?? null,
      media_caption: extracted.mediaCaption ?? null,
      reply_to_wamid: extracted.replyToWamid ?? null,
      ...(extracted.errorCode ? { error_code: extracted.errorCode } : {}),
      ...(extracted.failureReason ? { failure_reason: extracted.failureReason } : {}),
      ...(extracted.rawPayload ? { raw_payload: extracted.rawPayload } : {}),
      timestamp,
    },
  });
  if (receiptError) throw receiptError;
  if (!receipt?.conversation_id || !receipt?.message_id || typeof receipt.inserted !== 'boolean') {
    throw new Error('Recebimento da mensagem enviada pelo WhatsApp Business não confirmado pelo servidor.');
  }
  return receipt.inserted;
}

/**
 * Extrai resumo e metadados de uma mensagem da Meta
 */
function formatReceivedValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatReceivedValue).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => key.replace(/[_-]+/g, ' ') + ': ' + formatReceivedValue(item)).join('; ');
  }
  return String(value ?? '');
}

function removeFlowToken(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeFlowToken);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key.toLowerCase() !== 'flow_token')
        .map(([key, item]) => [key, removeFlowToken(item)]),
    );
  }
  return value;
}

type TemplatePreview = {
  name?: string;
  header?: { type: 'text' | 'image' | 'video' | 'document'; text?: string; filename?: string };
  body?: string;
  footer?: string;
  buttons: Array<{ type: 'url' | 'quick_reply' | 'phone_number' | 'flow'; text: string; url?: string; phoneNumber?: string }>;
};

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
}

function templateParameterText(parameter: any): string {
  switch (String(parameter?.type || '').toLowerCase()) {
    case 'text':
      return typeof parameter.text === 'string' ? parameter.text.trim().slice(0, 4096) : '';
    case 'currency':
      return typeof parameter.currency?.fallback_value === 'string'
        ? parameter.currency.fallback_value.trim().slice(0, 256)
        : '';
    case 'date_time':
      return typeof parameter.date_time?.fallback_value === 'string'
        ? parameter.date_time.fallback_value.trim().slice(0, 256)
        : '';
    default:
      return '';
  }
}

function templateComponentText(component: any): string {
  if (typeof component?.text === 'string') {
    const parameters = Array.isArray(component.parameters) ? component.parameters : [];
    return component.text.slice(0, 4096).replace(/\{\{\s*(\d+)\s*\}\}/g, (placeholder, rawIndex) => {
      const value = templateParameterText(parameters[Number(rawIndex) - 1]);
      return value || placeholder;
    });
  }
  return Array.isArray(component?.parameters)
    ? component.parameters.map(templateParameterText).filter(Boolean).join(' ').slice(0, 4096)
    : '';
}

function templateButton(component: any): TemplatePreview['buttons'][number] | null {
  const rawType = String(component?.sub_type || component?.type || '').toLowerCase();
  const type = rawType.includes('quick') ? 'quick_reply'
    : rawType === 'url' || rawType.includes('call_to_action') ? 'url'
      : rawType.includes('phone') ? 'phone_number'
        : rawType.includes('flow') ? 'flow'
          : null;
  if (!type) return null;
  const text = [component?.text, component?.title, component?.label]
    .find((value) => typeof value === 'string' && value.trim());
  const button: TemplatePreview['buttons'][number] = {
    type,
    text: (text || (type === 'url' ? 'Abrir link' : type === 'phone_number' ? 'Ligar' : type === 'flow' ? 'Abrir formulário' : 'Responder'))
      .trim().slice(0, 120),
  };
  if (type === 'url' && typeof component?.url === 'string') button.url = component.url.trim().slice(0, 2048);
  const phone = component?.phone_number || component?.phoneNumber;
  if (type === 'phone_number' && typeof phone === 'string') button.phoneNumber = phone.trim().slice(0, 40);
  return button;
}

function extractTemplatePreview(message: any): { preview: TemplatePreview; mediaId?: string; mediaMimeType?: string; mediaFilename?: string } | null {
  const template = asRecord(message?.template) || asRecord(message?.template_preview) || message;
  const components = Array.isArray(template.components) ? template.components : [];
  const componentOf = (name: string) => components.find((component: any) => String(component?.type || '').toLowerCase() === name) || null;
  const headerComponent = componentOf('header') || asRecord(template.header);
  const bodyComponent = componentOf('body') || (typeof template.body === 'string' ? { text: template.body } : null);
  const footerComponent = componentOf('footer') || (typeof template.footer === 'string' ? { text: template.footer } : null);
  const headerParameters = Array.isArray(headerComponent?.parameters) ? headerComponent.parameters : [];
  const mediaParameter = headerParameters.find((parameter: any) => ['image', 'video', 'document'].includes(String(parameter?.type || '').toLowerCase()));
  const mediaType = mediaParameter ? String(mediaParameter.type).toLowerCase() as 'image' | 'video' | 'document' : null;
  const media = mediaParameter && asRecord(mediaParameter[mediaType as string]);
  const headerFormat = String(headerComponent?.format || headerComponent?.type || '').toLowerCase();
  const headerText = templateComponentText(headerComponent) ||
    (typeof headerComponent?.text === 'string' ? headerComponent.text.trim().slice(0, 4096) : '');
  const headerType = mediaType || (headerFormat.includes('video') ? 'video'
    : headerFormat.includes('document') ? 'document'
      : headerFormat.includes('image') ? 'image'
        : headerText ? 'text' : null);
  const header = headerType ? {
    type: headerType as NonNullable<TemplatePreview['header']>['type'],
    ...(headerText ? { text: headerText } : {}),
    ...(typeof media?.filename === 'string' ? { filename: media.filename.trim().slice(0, 255) } : {}),
  } : undefined;
  const rawButtons = [
    ...components.flatMap((component: any) => String(component?.type || '').toLowerCase() === 'buttons'
      ? Array.isArray(component.buttons) ? component.buttons : []
      : String(component?.type || '').toLowerCase() === 'button' ? [component] : []),
    ...(Array.isArray(template.buttons) ? template.buttons : []),
  ];
  const buttons = rawButtons.map(templateButton).filter((button: any): button is TemplatePreview['buttons'][number] => Boolean(button)).slice(0, 10);
  const name = typeof template.name === 'string' ? template.name.trim().slice(0, 255) : '';
  const body = templateComponentText(bodyComponent);
  const footer = templateComponentText(footerComponent);
  if (!name && !header && !body && !footer && buttons.length === 0) return null;
  const preview: TemplatePreview = {
    ...(name ? { name } : {}),
    ...(header ? { header } : {}),
    ...(body ? { body } : {}),
    ...(footer ? { footer } : {}),
    buttons,
  };
  return {
    preview,
    ...(typeof media?.id === 'string' && media.id.trim() ? { mediaId: media.id.trim() } : {}),
    ...(typeof media?.mime_type === 'string' && media.mime_type.trim() ? { mediaMimeType: media.mime_type.trim() } :
      mediaType === 'image' ? { mediaMimeType: 'image/jpeg' } : mediaType === 'video' ? { mediaMimeType: 'video/mp4' } : {}),
    ...(typeof media?.filename === 'string' && media.filename.trim() ? { mediaFilename: media.filename.trim().slice(0, 255) } : {}),
  };
}

function extractMessageContentBase(msg: any): {
  type: string;
  text: string;
  mediaId?: string;
  mediaMimeType?: string;
  mediaFilename?: string;
  mediaCaption?: string;
  replyToWamid?: string;
  errorCode?: string;
  failureReason?: string;
  rawPayload?: Record<string, unknown>;
} {
  const type = msg.type || 'unknown';
  const replyToWamid = msg.context?.id || msg.reaction?.message_id;

  switch (type) {
    case 'text': {
      const product = msg.context?.referred_product;
      const referral = msg.referral;
      const extraText = [
        product && (product.product_retailer_id || product.catalog_id)
          ? `🛍️ Produto consultado: ${product.product_retailer_id || 'Produto do catálogo'}${product.catalog_id ? ` (catálogo ${product.catalog_id})` : ''}`
          : '',
        referral && [
          referral.headline, referral.body, referral.source_id, referral.source_type, referral.source_url,
        ].some(Boolean)
          ? [
              '📣 Origem da conversa',
              referral.headline,
              referral.body,
              referral.source_type ? 'Origem: ' + referral.source_type : '',
              referral.source_id ? 'Referência: ' + referral.source_id : '',
              referral.source_url ? 'Link de origem: ' + referral.source_url : '',
            ].filter(Boolean).join('\n')
          : '',
      ].filter(Boolean);
      return {
        type: 'text',
        text: [msg.text?.body || '', ...extraText].filter(Boolean).join('\n'),
        replyToWamid,
        ...(product || referral ? {
          rawPayload: {
            provider_message_type: type,
            ...(product ? { referred_product: product } : {}),
            ...(referral ? { referral } : {}),
          },
        } : {}),
      };
    }

    case 'image':
      return {
        type: 'image',
        text: msg.image?.caption || '[Imagem]',
        mediaId: msg.image?.id,
        mediaMimeType: msg.image?.mime_type || 'image/jpeg',
        mediaCaption: msg.image?.caption,
        replyToWamid,
      };

    case 'document':
      return {
        type: 'document',
        text: msg.document?.filename || msg.document?.caption || '[Documento]',
        mediaId: msg.document?.id,
        mediaMimeType: msg.document?.mime_type || 'application/octet-stream',
        mediaFilename: msg.document?.filename || 'documento',
        mediaCaption: msg.document?.caption,
        replyToWamid,
      };

    case 'audio':
      return {
        type: 'audio',
        text: '[Áudio]',
        mediaId: msg.audio?.id,
        mediaMimeType: msg.audio?.mime_type || 'audio/ogg',
        replyToWamid,
      };

    case 'video':
      return {
        type: 'video',
        text: msg.video?.caption || '[Vídeo]',
        mediaId: msg.video?.id,
        mediaMimeType: msg.video?.mime_type || 'video/mp4',
        mediaCaption: msg.video?.caption,
        replyToWamid,
      };

    case 'template': {
      const extracted = extractTemplatePreview(msg);
      if (!extracted) {
        return {
          type: 'unsupported',
          text: 'A Meta informou uma mensagem de modelo sem prévia do conteúdo.',
          replyToWamid,
          rawPayload: { provider_message_type: type },
        };
      }
      const { preview } = extracted;
      return {
        type: 'template',
        text: [preview.name ? `Modelo: ${preview.name}` : '', preview.body || '', preview.footer || ''].filter(Boolean).join('\n\n') || 'Mensagem de modelo do WhatsApp',
        mediaId: extracted.mediaId,
        mediaMimeType: extracted.mediaMimeType,
        mediaFilename: extracted.mediaFilename,
        replyToWamid,
        rawPayload: { provider_message_type: type, template_preview: preview },
      };
    }

    case 'interactive': {
      const flowReply = msg.interactive?.nfm_reply;
      if (flowReply) {
        const responseJson = typeof flowReply.response_json === 'string' ? flowReply.response_json : '';
        let response: Record<string, unknown> = {};
        let parsedResponse = false;
        try {
          const parsed = responseJson ? JSON.parse(responseJson) : flowReply.response_json;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            response = parsed;
            parsedResponse = true;
          }
        } catch {
          // Show a safe fallback rather than exposing an opaque Flow token or payload.
        }
        const safeResponse = removeFlowToken(response) as Record<string, unknown>;
        const responseLines = Object.entries(safeResponse)
          .map(([key, value]) => key.replace(/[_-]+/g, ' ') + ': ' + formatReceivedValue(value));
        const flowName = typeof flowReply.name === 'string' ? flowReply.name.trim() : '';
        const fallbackLine = !parsedResponse && responseJson ? 'Resposta recebida em formato não reconhecido.' : '';
        return {
          type: 'interactive',
          text: ['📋 Resposta do formulário', flowName ? 'Fluxo: ' + flowName : '', ...responseLines, fallbackLine]
            .filter(Boolean).join('\n'),
          replyToWamid,
          rawPayload: {
            provider_message_type: type,
            interactive: {
              type: 'nfm_reply',
              nfm_reply: { ...(flowName ? { name: flowName } : {}), response: safeResponse },
            },
          },
        };
      }

      const selection = msg.interactive?.button_reply || msg.interactive?.list_reply;
      const buttonTitle = selection?.title || 'Resposta interativa';
      const description = typeof selection?.description === 'string' ? selection.description.trim() : '';
      const selectionId = typeof selection?.id === 'string' ? selection.id.trim() : '';
      return {
        type: 'interactive',
        text: [`🔘 ${buttonTitle}`, description,
          selectionId ? `Identificador: ${selectionId}` : ''].filter(Boolean).join('\n'),
        replyToWamid,
        rawPayload: { provider_message_type: type, interactive: msg.interactive || {} },
      };
    }

    case 'button': {
      const buttonLabel = msg.button?.text || msg.button?.payload || 'Resposta de botão';
      const buttonPayload = msg.button?.payload && msg.button.payload !== buttonLabel
        ? `Identificador: ${msg.button.payload}`
        : '';
      return {
        type: 'interactive',
        text: [`🔘 ${buttonLabel}`, buttonPayload].filter(Boolean).join('\n'),
        replyToWamid,
        rawPayload: { provider_message_type: type, button: msg.button || {} },
      };
    }

    case 'reaction': {
      const emoji = typeof msg.reaction?.emoji === 'string' ? msg.reaction.emoji : '';
      return {
        type: 'interactive',
        text: emoji ? `Reação ${emoji} a uma mensagem` : 'Reação removida de uma mensagem',
        replyToWamid,
        rawPayload: { provider_message_type: type, reaction: msg.reaction || {} },
      };
    }

    case 'order': {
      const order = msg.order || {};
      const items = Array.isArray(order.product_items) ? order.product_items : [];
      const itemSummaries = items.map((item: any) => {
        const quantity = String(item?.quantity ?? '1').trim() || '1';
        const product = typeof item?.product_retailer_id === 'string' && item.product_retailer_id.trim()
          ? item.product_retailer_id.trim()
          : 'Produto do catálogo';
        const amount = item?.item_price == null ? Number.NaN : Number(item.item_price);
        const currency = typeof item?.currency === 'string' ? item.currency.toUpperCase() : '';
        let unitPrice = '';
        if (Number.isFinite(amount)) {
          try {
            unitPrice = currency
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount).replace(/\u00a0/g, ' ')
              : amount.toFixed(2);
          } catch {
            unitPrice = `${amount.toFixed(2)}${currency ? ` ${currency}` : ''}`;
          }
        }
        return `• ${quantity} × ${product}${unitPrice ? ` — ${unitPrice} cada` : ''}`;
      });
      const customerText = typeof order.text === 'string' ? order.text.trim() : '';
      const catalogId = typeof order.catalog_id === 'string' ? order.catalog_id.trim() : '';
      return {
        type: 'interactive',
        text: [
          '🛒 Pedido recebido pelo catálogo',
          ...(catalogId ? [`Catálogo: ${catalogId}`] : []),
          ...itemSummaries,
          ...(customerText ? [`Mensagem: ${customerText}`] : []),
        ].join('\n'),
        replyToWamid,
        rawPayload: { provider_message_type: type, order },
      };
    }

    case 'system': {
      const systemBody = typeof msg.system?.body === 'string' ? msg.system.body.trim() : '';
      const systemType = typeof msg.system?.type === 'string'
        ? msg.system.type.replace(/_/g, ' ')
        : '';
      return {
        type: 'interactive',
        text: systemBody || (systemType ? `Aviso do WhatsApp: ${systemType}` : 'Aviso do sistema do WhatsApp'),
        replyToWamid,
        rawPayload: { provider_message_type: type, system: msg.system || {} },
      };
    }

    case 'request_welcome':
      return {
        type: 'interactive',
        text: '👋 Cliente solicitou iniciar o atendimento',
        replyToWamid,
        rawPayload: { provider_message_type: type },
      };

    case 'sticker':
      return {
        type: 'sticker',
        text: '[Figurinha]',
        mediaId: msg.sticker?.id,
        mediaMimeType: msg.sticker?.mime_type || 'image/webp',
        replyToWamid,
      };

    case 'location': {
      const loc = msg.location || {};
      const hasCoordinates = loc.latitude != null && loc.longitude != null;
      const text = [
        loc.name ? `📍 ${loc.name}` : '📍 Localização compartilhada',
        hasCoordinates ? `${loc.latitude}, ${loc.longitude}` : '',
        typeof loc.address === 'string' && loc.address.trim() ? loc.address.trim() : '',
        typeof loc.url === 'string' && loc.url.trim() ? `Link: ${loc.url.trim()}` : '',
      ].filter(Boolean).join('\n');
      return {
        type: 'location',
        text,
        replyToWamid,
        rawPayload: { provider_message_type: type, location: loc },
      };
    }

    case 'contacts': {
      const contacts = Array.isArray(msg.contacts) ? msg.contacts : [];
      const summaries = contacts.map((contact: any) => {
        const name = contact?.name?.formatted_name || [
          contact?.name?.first_name,
          contact?.name?.middle_name,
          contact?.name?.last_name,
        ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0).join(' ');
        const phones = Array.isArray(contact?.phones)
          ? contact.phones
            .map((phone: any) => {
              const value = phone?.phone || phone?.wa_id;
              return value ? `${phone?.type ? `${phone.type}: ` : ''}${value}` : '';
            })
            .filter((phone: unknown): phone is string => typeof phone === 'string' && phone.trim().length > 0)
          : [];
        const emails = Array.isArray(contact?.emails)
          ? contact.emails.map((item: any) => item?.email
            ? `E-mail${item.type ? ` (${item.type})` : ''}: ${item.email}` : '').filter(Boolean)
          : [];
        const addresses = Array.isArray(contact?.addresses)
          ? contact.addresses.map((item: any) => {
              const value = [item?.street, item?.city, item?.state, item?.zip, item?.country].filter(Boolean).join(', ');
              return value ? `Endereço${item.type ? ` (${item.type})` : ''}: ${value}` : '';
            }).filter(Boolean)
          : [];
        const urls = Array.isArray(contact?.urls)
          ? contact.urls.map((item: any) => item?.url
            ? `URL${item.type ? ` (${item.type})` : ''}: ${item.url}` : '').filter(Boolean)
          : [];
        const organization = contact?.org
          ? [contact.org.company, contact.org.department, contact.org.title].filter(Boolean).join(' — ')
          : '';
        const otherDetails = [
          ...emails,
          ...addresses,
          ...urls,
          organization ? `Organização: ${organization}` : '',
          contact?.birthday ? `Aniversário: ${contact.birthday}` : '',
        ];
        const vcard = typeof contact?.vcard === 'string' ? contact.vcard.trim() : '';
        return [name, ...phones, ...otherDetails,
          ...(!name && phones.length === 0 && otherDetails.length === 0 && vcard ? [`vCard:\n${vcard}`] : [])]
          .filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
          .join(' — ');
      }).filter((summary: string) => summary.length > 0);
      const title = summaries.length === 1 ? '👤 Contato compartilhado' : '👤 Contatos compartilhados';
      return {
        type: 'contacts',
        text: summaries.length > 0 ? `${title}:\n${summaries.join('\n')}` : '👤 Contato compartilhado',
        replyToWamid,
        rawPayload: { provider_message_type: type, contacts },
      };
    }

    default:
      if (
        type === 'unsupported' ||
        (type === 'unknown' && Array.isArray(msg.errors) && msg.errors.length > 0)
      ) {
        const providerError = Array.isArray(msg.errors) ? msg.errors[0] : null;
        const errorCode = providerError?.code != null ? String(providerError.code) : '';
        const providerTitle = typeof providerError?.title === 'string'
          ? providerError.title.trim()
          : '';
        const providerDetails = typeof providerError?.details === 'string'
          ? providerError.details.trim()
          : typeof providerError?.error_data?.details === 'string'
            ? providerError.error_data.details.trim()
            : '';
        const providerMessage = typeof providerError?.message === 'string'
          ? providerError.message.trim()
          : '';
        const explanation = errorCode === '131051'
          ? 'A API do WhatsApp informou que este tipo de mensagem não é suportado.'
          : providerDetails || providerTitle || providerMessage || 'A Meta não disponibilizou uma prévia compatível.';
        const rawPayload: Record<string, unknown> = { provider_message_type: type };
        if (Array.isArray(msg.errors)) rawPayload.provider_errors = msg.errors;
        return {
          type: 'unsupported',
          text: explanation + (errorCode ? ' (código ' + errorCode + ')' : ''),
          replyToWamid,
          errorCode: errorCode || undefined,
          failureReason: [providerTitle, providerDetails, providerMessage].filter(Boolean).join(' — ') || undefined,
          rawPayload,
        };
      }
      return {
        type: 'unsupported',
        text: `A central ainda não consegue exibir este tipo de mensagem (${String(type).replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'não identificado'}).`,
        replyToWamid,
        rawPayload: { provider_message_type: type },
      };
  }
}

export function extractMessageContent(msg: any) {
  const extracted = extractMessageContentBase(msg);
  const forwarded = msg?.context?.forwarded === true;
  const frequentlyForwarded = msg?.context?.frequently_forwarded === true;
  const referredProduct = msg?.context?.referred_product;
  const referral = msg?.referral && typeof msg.referral === 'object' && !Array.isArray(msg.referral) ? msg.referral : null;
  const identity = msg?.identity && typeof msg.identity === 'object' && !Array.isArray(msg.identity) ? msg.identity : null;
  if (!forwarded && !frequentlyForwarded && !referredProduct && !referral && !identity) return extracted;

  const safeIdentity = identity ? {
    ...(typeof identity.acknowledged === 'boolean' ? { acknowledged: identity.acknowledged } : {}),
    ...(typeof identity.created_timestamp === 'string' || (typeof identity.created_timestamp === 'number' && Number.isFinite(identity.created_timestamp))
      ? { created_timestamp: identity.created_timestamp }
      : {}),
  } : null;

  return {
    ...extracted,
    rawPayload: {
      ...(extracted.rawPayload || {}),
      provider_message_type: extracted.rawPayload?.provider_message_type || msg?.type || 'unknown',
      ...(forwarded ? { forwarded: true } : {}),
      ...(frequentlyForwarded ? { frequently_forwarded: true } : {}),
      ...(referredProduct ? { referred_product: referredProduct } : {}),
      ...(referral ? { referral } : {}),
      ...(safeIdentity ? { identity: safeIdentity } : {}),
    },
  };
}

/**
 * Processador principal do payload do Webhook da Meta
 */
export async function processWhatsAppWebhookPayload(
  supabase: SupabaseClient,
  body: any
): Promise<WebhookProcessResult> {
  const result: WebhookProcessResult = {
    processedMessages: 0,
    processedStatuses: 0,
    deliveryConfirmations: 0,
    duplicatesIgnored: 0,
    errors: [],
  };

  if (!body || !body.entry || !Array.isArray(body.entry)) {
    return result;
  }

  for (const entry of body.entry) {
    if (!entry.changes || !Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      const value = change.value;
      if (!value) continue;

      const businessPhoneNumberId = String(value.metadata?.phone_number_id || '');

      // Coexistence reports messages sent from the WhatsApp Business app in a
      // separate webhook field. Persist them as outbound echoes for every agent.
      if (change.field === 'smb_message_echoes' && Array.isArray(value.message_echoes)) {
        for (const message of value.message_echoes) {
          try {
            const inserted = await processBusinessAppEcho(supabase, businessPhoneNumberId, value, message);
            if (inserted) result.processedMessages++;
            else if (inserted === false) result.duplicatesIgnored++;
          } catch (err: any) {
            console.error('[WhatsApp Webhook] Erro ao processar mensagem enviada pelo app:', err);
            result.errors.push(err.message || String(err));
          }
        }
      }

      // 1. Processa mensagens recebidas
      if (value.messages && Array.isArray(value.messages)) {
        for (const message of value.messages) {
          try {
            const from = String(message.from || '');
            if (!from) continue;
            if (message.type === 'revoke') {
              const changed = await processRevokedMessage(
                supabase,
                businessPhoneNumberId,
                from,
                message,
                'inbound',
              );
              if (changed) result.processedMessages++;
              else if (changed === false) result.duplicatesIgnored++;
              continue;
            }

            const wamid = message.id;
            if (!wamid) continue;

            // PRESERVAÇÃO: Confirmação de Entrega por botão interativo
            if (message.type === 'interactive' && message.interactive?.button_reply) {
              const buttonId = String(message.interactive.button_reply.id || '');
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
                result.deliveryConfirmations++;
              }
            }

            // IDEMPOTÊNCIA: Verifica se a mensagem já foi salva anteriormente
            const { data: existingMsg, error: duplicateError } = await supabase
              .from('whatsapp_messages')
              .select('id')
              .eq('api_message_id', wamid)
              .maybeSingle();

            if (duplicateError) throw duplicateError;

            // Extrai nome de perfil enviado pela Meta
            const contactProfile =
              value.contacts?.find((c: any) => c.wa_id === from)?.profile?.name ||
              value.contacts?.[0]?.profile?.name ||
              null;

            const contactPhoneE164 = normalizeToE164(from);
            const messageTimestamp = message.timestamp
              ? new Date(Number(message.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let matchedCustomerId: string | null = null;
            let customerLinkStatus = 'unlinked';
            // A known ID only skips matching. The RPC must still validate its
            // channel/contact and direction before classifying it as duplicate.
            if (!existingMsg) {
              // Matching stays outside the transaction. The RPC rechecks the
              // current link under its row lock before applying any match.
              const { data: convData, error: conversationError } = await supabase
                .from('whatsapp_conversations')
                .select('id, customer_id, customer_link_status')
                .eq('business_phone_number_id', businessPhoneNumberId)
                .eq('contact_wa_id', from)
                .maybeSingle();
              if (conversationError) throw conversationError;

              if (!convData?.customer_id && convData?.customer_link_status !== 'manually_linked') {
                const matchResult = await matchCustomerByPhone(supabase, from);
                if (matchResult.status === 'auto_matched' && matchResult.customer) {
                  matchedCustomerId = matchResult.customer.id;
                  customerLinkStatus = 'auto_matched';
                } else if (matchResult.status === 'ambiguous') {
                  customerLinkStatus = 'ambiguous';
                }
              }
            }

            const extracted = extractMessageContent(message);

            // The provider ID, inbound row, summary/count and persisted reopening
            // event are committed together. No fallback to separate writes.
            const { data: receipt, error: receiptError } = await supabase.rpc('customer_support_receive_message', {
              p_business_phone_number_id: businessPhoneNumberId,
              p_contact_wa_id: from,
              p_contact_phone: contactPhoneE164,
              p_contact_name: contactProfile,
              p_customer_id: matchedCustomerId,
              p_customer_link_status: customerLinkStatus,
              p_message: {
                api_message_id: wamid,
                message_type: extracted.type,
                text_content: extracted.text,
                media_id: extracted.mediaId ?? null,
                media_mime_type: extracted.mediaMimeType ?? null,
                media_filename: extracted.mediaFilename ?? null,
                media_caption: extracted.mediaCaption ?? null,
                reply_to_wamid: extracted.replyToWamid ?? null,
                ...(extracted.errorCode ? { error_code: extracted.errorCode } : {}),
                ...(extracted.failureReason ? { failure_reason: extracted.failureReason } : {}),
                ...(extracted.rawPayload ? { raw_payload: extracted.rawPayload } : {}),
                timestamp: messageTimestamp,
              },
            });
            if (receiptError) throw receiptError;
            if (!receipt?.conversation_id || !receipt?.message_id || typeof receipt.inserted !== 'boolean') {
              throw new Error('Recebimento da mensagem não confirmado pelo servidor.');
            }
            if (receipt.inserted) result.processedMessages++;
            else result.duplicatesIgnored++;
          } catch (err: any) {
            console.error('[WhatsApp Webhook] Erro ao processar mensagem individual:', err);
            result.errors.push(err.message || String(err));
          }
        }
      }

      // 2. Processa status de entrega (sent, delivered, read, failed)
      if (value.statuses && Array.isArray(value.statuses)) {
        for (const statusItem of value.statuses) {
          try {
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

            // Atualiza tabela de despachos (PRESERVAÇÃO DO FLUXO EXISTENTE)
            await supabase
              .from('whatsapp_dispatches')
              .update({
                status: deliveryStatus,
                updated_at: updatedAt,
                raw_payload: statusItem,
                ...(failureReason ? { failure_reason: failureReason } : {}),
                ...(errorCode ? { error_code: errorCode } : {}),
              })
              .eq('api_message_id', msgId);

            // Atualiza tabela de termos de garantia (PRESERVAÇÃO DO FLUXO EXISTENTE)
            await supabase
              .from('warranty_terms')
              .update({
                delivery_status: deliveryStatus,
                delivery_status_updated_at: updatedAt,
                ...(failureReason ? { failure_reason: failureReason } : {}),
              })
              .eq('api_message_id', msgId);

            // Atualiza tabela de mensagens da Central de Atendimento se for mensagem enviada
            await supabase
              .from('whatsapp_messages')
              .update({
                status: deliveryStatus,
                ...(failureReason ? { failure_reason: failureReason } : {}),
                ...(errorCode ? { error_code: errorCode } : {}),
              })
              .eq('api_message_id', msgId);

            result.processedStatuses++;
          } catch (err: any) {
            console.error('[WhatsApp Webhook] Erro ao atualizar status individual:', err);
            result.errors.push(err.message || String(err));
          }
        }
      }
    }
  }

  return result;
}
