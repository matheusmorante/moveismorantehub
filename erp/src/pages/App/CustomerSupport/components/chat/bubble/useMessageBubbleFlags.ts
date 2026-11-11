import { useMemo } from 'react';
import type { WhatsAppMessage } from '../../types';

export function isCustomerSupportAiMessage(message: WhatsAppMessage): boolean {
  if (message.rawPayload?.is_ai === true) return true;
  if (message.rawPayload?.origin === 'customer_support_ai_agent') return true;
  if (typeof message.authorName === 'string') {
    const lower = message.authorName.toLowerCase();
    if (lower.includes('ia') || lower.includes('lizandro')) return true;
  }
  return false;
}

export function useMessageBubbleFlags(message: WhatsAppMessage) {
  return useMemo(() => {
    const isInbound = message.direction === 'inbound';
    const isInternalNote = message.messageType === 'internal_note';
    const isSystemEvent = message.messageType === 'system_event';
    const isReactionMessage =
      message.rawPayload?.provider_message_type === 'reaction' ||
      /^Reação .+ a uma mensagem$/u.test(message.textContent || '') ||
      message.textContent === 'Reação removida de uma mensagem';
    const isAiMessage = isCustomerSupportAiMessage(message);
    const isSuggestion = message.rawPayload?.accepted_ai_suggestion !== true &&
      (message.status === 'suggested' || message.rawPayload?.is_suggestion === true);
    const isNonChatEvent = ['system', 'request_welcome'].includes(message.rawPayload?.provider_message_type);

    const timeFormatted = message.timestamp
      ? new Date(message.timestamp).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const canReply =
      Boolean(message.apiMessageId) && message.messageType !== 'deleted' && !isReactionMessage && !isNonChatEvent;
    const canForward =
      !isReactionMessage &&
      !isNonChatEvent &&
      (['text', 'interactive', 'location', 'contacts'].includes(message.messageType)
        ? Boolean(message.textContent?.trim())
        : message.messageType === 'template'
          ? Boolean(message.textContent?.trim() || message.mediaId)
          : ['image', 'document', 'audio', 'video', 'sticker'].includes(message.messageType) &&
            Boolean(message.mediaId));

    return {
      isInbound,
      isInternalNote,
      isSystemEvent,
      isReactionMessage,
      isAiMessage,
      isSuggestion,
      isNonChatEvent,
      timeFormatted,
      canReply,
      canForward,
    };
  }, [message]);
}
