import { extractTemplatePreview } from './whatsappTemplatePreview.js';

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

