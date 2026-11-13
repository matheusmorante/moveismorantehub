import {
  type ExtractedMessageContent,
  parseInteractiveFlow,
  parseInteractiveProduct,
  parseInteractiveSelection,
  parseCatalogOrder,
  parseContactsMessage,
  parseMediaMessage,
  parseTextMessage,
  parseSystemMessage,
  parseLocationMessage,
  parseUnsupportedMessage,
  enrichWithMetaContext,
} from './messageContent/index.js';

export * from './messageContent/index.js';

function extractMessageContentBase(msg: any): ExtractedMessageContent {
  const type = msg.type || 'unknown';
  const replyToWamid = msg.context?.id || msg.reaction?.message_id;

  if (type === 'text') {
    return parseTextMessage(msg, replyToWamid);
  }

  const mediaResult = parseMediaMessage(type, msg, replyToWamid);
  if (mediaResult) {
    return mediaResult;
  }

  switch (type) {
    case 'interactive': {
      if (msg.interactive?.type === 'product' && msg.interactive.product && typeof msg.interactive.product === 'object') {
        return parseInteractiveProduct(msg.interactive, replyToWamid, type);
      }
      if (msg.interactive?.nfm_reply) {
        return parseInteractiveFlow(msg.interactive.nfm_reply, replyToWamid, type);
      }
      const selection = msg.interactive?.button_reply || msg.interactive?.list_reply;
      return parseInteractiveSelection(selection, msg.interactive, replyToWamid, type);
    }

    case 'button': {
      const buttonLabel = msg.button?.text || msg.button?.payload || 'Resposta de botão';
      const buttonPayload =
        msg.button?.payload && msg.button.payload !== buttonLabel
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

    case 'order':
      return parseCatalogOrder(msg.order, replyToWamid, type);

    case 'system':
    case 'request_welcome':
      return parseSystemMessage(msg, replyToWamid);

    case 'location':
      return parseLocationMessage(msg, replyToWamid);

    case 'contacts':
      return parseContactsMessage(msg.contacts, replyToWamid, type);

    default:
      return parseUnsupportedMessage(type, msg, replyToWamid);
  }
}

export function extractMessageContent(msg: any) {
  const extracted = extractMessageContentBase(msg);
  return enrichWithMetaContext(extracted, msg);
}
