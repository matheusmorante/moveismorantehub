import { useState } from 'react';
import type { WhatsAppMessage } from '../../types';

interface UseMessageBubbleQuoteResolutionParams {
  message: WhatsAppMessage;
  quotedMessage?: WhatsAppMessage;
  contactName?: string;
  onResolveReplyTarget?: (reference: {
    conversationId: string;
    messageId: string | null;
    apiMessageId: string | null;
  }) => Promise<WhatsAppMessage | null>;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
}

export function useMessageBubbleQuoteResolution({
  message,
  quotedMessage,
  contactName,
  onResolveReplyTarget,
  onJumpToMessage,
}: UseMessageBubbleQuoteResolutionParams) {
  const [resolvedQuote, setResolvedQuote] = useState<WhatsAppMessage | null>(null);
  const [isResolvingQuote, setIsResolvingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const quote = resolvedQuote || quotedMessage;
  const quotePreview =
    quote?.textContent ||
    quote?.mediaCaption ||
    quote?.mediaFilename ||
    (quote?.messageType === 'image'
      ? 'Foto'
      : quote?.messageType === 'document'
        ? 'Documento'
        : quote
          ? 'Mídia compartilhada'
          : 'Referência à mensagem anterior');

  const quoteAuthor = quote
    ? quote.direction === 'inbound'
      ? contactName || 'Cliente'
      : quote.authorName || 'Atendente'
    : '';

  const handleQuotedMessage = async () => {
    setQuoteError('');
    if (quote) {
      onJumpToMessage?.(quote);
      return;
    }
    if (!onResolveReplyTarget || isResolvingQuote) return;
    setIsResolvingQuote(true);
    try {
      const resolved = await onResolveReplyTarget({
        conversationId: message.conversationId,
        messageId: message.replyToMessageId,
        apiMessageId: message.replyToWamid,
      });
      if (!resolved) {
        setQuoteError('A mensagem citada não está disponível nesta conversa.');
        return;
      }
      setResolvedQuote(resolved);
      onJumpToMessage?.(resolved);
    } catch (error) {
      setQuoteError(
        error instanceof Error ? error.message : 'Não foi possível localizar a mensagem citada.'
      );
    } finally {
      setIsResolvingQuote(false);
    }
  };

  return {
    quote,
    quoteAuthor,
    quotePreview,
    isResolvingQuote,
    quoteError,
    handleQuotedMessage,
  };
}
