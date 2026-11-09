import type { ExtractedMessageContent } from './types.js';

export function parseTextMessage(msg: any, replyToWamid?: string): ExtractedMessageContent {
  const type = 'text';
  const product = msg.context?.referred_product;
  const referral = msg.referral;
  const extraText = [
    product && (product.product_retailer_id || product.catalog_id)
      ? `🛍️ Produto consultado: ${product.product_retailer_id || 'Produto do catálogo'}${
          product.catalog_id ? ` (catálogo ${product.catalog_id})` : ''
        }`
      : '',
    referral &&
    [
      referral.headline,
      referral.body,
      referral.source_id,
      referral.source_type,
      referral.source_url,
    ].some(Boolean)
      ? [
          '📣 Origem da conversa',
          referral.headline,
          referral.body,
          referral.source_type ? 'Origem: ' + referral.source_type : '',
          referral.source_id ? 'Referência: ' + referral.source_id : '',
          referral.source_url ? 'Link de origem: ' + referral.source_url : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
  ].filter(Boolean);

  return {
    type: 'text',
    text: [msg.text?.body || '', ...extraText].filter(Boolean).join('\n'),
    replyToWamid,
    ...(product || referral
      ? {
          rawPayload: {
            provider_message_type: type,
            ...(product ? { referred_product: product } : {}),
            ...(referral ? { referral } : {}),
          },
        }
      : {}),
  };
}

export function parseSystemMessage(msg: any, replyToWamid?: string): ExtractedMessageContent {
  const type = msg.type || 'system';
  if (type === 'request_welcome') {
    return {
      type: 'interactive',
      text: '👋 Cliente solicitou iniciar o atendimento',
      replyToWamid,
      rawPayload: { provider_message_type: type },
    };
  }

  const systemBody = typeof msg.system?.body === 'string' ? msg.system.body.trim() : '';
  const systemType =
    typeof msg.system?.type === 'string' ? msg.system.type.replace(/_/g, ' ') : '';
  return {
    type: 'interactive',
    text:
      systemBody || (systemType ? `Aviso do WhatsApp: ${systemType}` : 'Aviso do sistema do WhatsApp'),
    replyToWamid,
    rawPayload: { provider_message_type: type, system: msg.system || {} },
  };
}

export function parseLocationMessage(msg: any, replyToWamid?: string): ExtractedMessageContent {
  const type = 'location';
  const loc = msg.location || {};
  const hasCoordinates = loc.latitude != null && loc.longitude != null;
  const text = [
    loc.name ? `📍 ${loc.name}` : '📍 Localização compartilhada',
    hasCoordinates ? `${loc.latitude}, ${loc.longitude}` : '',
    typeof loc.address === 'string' && loc.address.trim() ? loc.address.trim() : '',
    typeof loc.url === 'string' && loc.url.trim() ? `Link: ${loc.url.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    type: 'location',
    text,
    replyToWamid,
    rawPayload: { provider_message_type: type, location: loc },
  };
}

export function parseUnsupportedMessage(
  type: string,
  msg: any,
  replyToWamid?: string
): ExtractedMessageContent {
  if (
    type === 'unsupported' ||
    (type === 'unknown' && Array.isArray(msg.errors) && msg.errors.length > 0)
  ) {
    const providerError = Array.isArray(msg.errors) ? msg.errors[0] : null;
    const errorCode = providerError?.code != null ? String(providerError.code) : '';
    const providerTitle =
      typeof providerError?.title === 'string' ? providerError.title.trim() : '';
    const providerDetails =
      typeof providerError?.details === 'string'
        ? providerError.details.trim()
        : typeof providerError?.error_data?.details === 'string'
          ? providerError.error_data.details.trim()
          : '';
    const providerMessage =
      typeof providerError?.message === 'string' ? providerError.message.trim() : '';
    const explanation =
      errorCode === '131051'
        ? 'A API do WhatsApp informou que este tipo de mensagem não é suportado.'
        : providerDetails ||
          providerTitle ||
          providerMessage ||
          'A Meta não disponibilizou uma prévia compatível.';
    const rawPayload: Record<string, unknown> = { provider_message_type: type };
    if (Array.isArray(msg.errors)) rawPayload.provider_errors = msg.errors;
    return {
      type: 'unsupported',
      text: explanation + (errorCode ? ' (código ' + errorCode + ')' : ''),
      replyToWamid,
      errorCode: errorCode || undefined,
      failureReason:
        [providerTitle, providerDetails, providerMessage].filter(Boolean).join(' — ') || undefined,
      rawPayload,
    };
  }

  return {
    type: 'unsupported',
    text: `A central ainda não consegue exibir este tipo de mensagem (${
      String(type).replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'não identificado'
    }).`,
    replyToWamid,
    rawPayload: { provider_message_type: type },
  };
}
