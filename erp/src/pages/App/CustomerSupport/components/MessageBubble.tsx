import React, { useState } from 'react';
import { WhatsAppMessage } from '../types';
import { useCustomerSupportMedia } from '../hooks/useCustomerSupportMedia';
import { MediaLoadStatus } from './chat/bubble/MediaLoadStatus';
import {
  renderFormattedText,
  SystemEventBubble,
  InternalNoteBubble,
  MessageBubbleStatus,
  MessageBubbleMedia,
  MediaLightboxModal,
} from './chat/bubble';

export interface MessageBubbleProps {
  message: WhatsAppMessage;
  contactName?: string;
  reactions?: string[];
  quotedMessage?: WhatsAppMessage;
  onReplyMessage?: (message: WhatsAppMessage) => void;
  onForwardMessage?: (message: WhatsAppMessage) => void;
  onResolveReplyTarget?: (reference: { conversationId: string; messageId: string | null; apiMessageId: string | null }) => Promise<WhatsAppMessage | null>;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  contactName,
  reactions = [],
  quotedMessage,
  onReplyMessage,
  onForwardMessage,
  onResolveReplyTarget,
  onJumpToMessage,
}) => {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [resolvedQuote, setResolvedQuote] = useState<WhatsAppMessage | null>(null);
  const [isResolvingQuote, setIsResolvingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const isInbound = message.direction === 'inbound';
  const isInternalNote = message.messageType === 'internal_note';
  const isSystemEvent = message.messageType === 'system_event';
  const isReactionMessage = message.rawPayload?.provider_message_type === 'reaction'
    || /^Reação .+ a uma mensagem$/u.test(message.textContent || '')
    || message.textContent === 'Reação removida de uma mensagem';
  const isNonChatEvent = ['system', 'request_welcome'].includes(message.rawPayload?.provider_message_type);
  const identityNotice = message.rawPayload?.identity && typeof message.rawPayload.identity === 'object';
  const referral = message.messageType !== 'text' && message.rawPayload?.referral && typeof message.rawPayload.referral === 'object'
    ? message.rawPayload.referral
    : null;
  const referredProduct = message.messageType !== 'text' && message.rawPayload?.referred_product
    && typeof message.rawPayload.referred_product === 'object'
    ? message.rawPayload.referred_product
    : null;
  const { mediaUrl, isLoadingMedia, mediaError, retryMedia } = useCustomerSupportMedia(
    ['image', 'document', 'audio', 'video', 'sticker', 'template'].includes(message.messageType) ? message.mediaId : null
  );

  const timeFormatted = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const quote = resolvedQuote || quotedMessage;
  const quotePreview = quote?.textContent || quote?.mediaCaption || quote?.mediaFilename ||
    (quote?.messageType === 'image' ? 'Foto' : quote?.messageType === 'document' ? 'Documento' : quote ? 'Mídia compartilhada' : 'Referência à mensagem anterior');
  const quoteAuthor = quote
    ? quote.direction === 'inbound' ? contactName || 'Cliente' : quote.authorName || 'Atendente'
    : '';
  const canReply = Boolean(message.apiMessageId) && message.messageType !== 'deleted' && !isReactionMessage && !isNonChatEvent;
  const canForward = !isReactionMessage && !isNonChatEvent && (['text', 'interactive', 'location', 'contacts'].includes(message.messageType)
    ? Boolean(message.textContent?.trim())
    : ['image', 'document', 'audio', 'video', 'sticker'].includes(message.messageType) && Boolean(message.mediaId));
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
      setQuoteError(error instanceof Error ? error.message : 'Não foi possível localizar a mensagem citada.');
    } finally {
      setIsResolvingQuote(false);
    }
  };

  // 1. Eventos de Sistema / Automação (Centralizados na timeline)
  if (isSystemEvent) {
    return <SystemEventBubble message={message} timeFormatted={timeFormatted} />;
  }

  // 2. Comentários Internos da Equipe ("Leaving a comment here")
  if (isInternalNote) {
    return <InternalNoteBubble message={message} timeFormatted={timeFormatted} />;
  }

  // 3. Mensagens Padrão (Inbound e Outbound) com Avatares Laterais
  const senderInitials = isInbound
    ? (contactName || 'C')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : (message.authorName || 'M')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');

  return (
    <div
      className={`flex w-full my-1.5 items-end gap-2 ${
        isInbound ? 'justify-start' : 'justify-end'
      }`}
    >
      {/* Avatar do Contato (à esquerda em mensagens recebidas) */}
      {isInbound && (
        <div
          title={contactName || 'Cliente'}
          className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs border border-slate-300/50 dark:border-slate-600 mb-0.5"
        >
          {senderInitials || <i className="bi bi-person text-xs text-slate-400"></i>}
        </div>
      )}

      <div
        className={`group/message relative max-w-[85%] sm:max-w-[72%] md:max-w-[62%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs leading-relaxed select-text transition-all ${
          isInbound
            ? 'bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/50 dark:border-slate-700/50'
            : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs border border-emerald-200/60 dark:border-emerald-700/50'
        }`}
      >
        {(onReplyMessage || (onForwardMessage && canForward)) && (
          <div className="absolute -top-3 right-2 z-10 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/message:opacity-100 sm:focus-within:opacity-100">
            {onReplyMessage && canReply && (
              <button type="button" title="Responder esta mensagem" aria-label="Responder esta mensagem"
                onClick={() => onReplyMessage(message)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950">
                <i className="bi bi-reply-fill text-sm" />
              </button>
            )}
            {onForwardMessage && canForward && (
              <button type="button" title="Encaminhar mensagem" aria-label="Encaminhar mensagem"
                onClick={() => onForwardMessage(message)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950">
                <i className="bi bi-forward-fill text-sm" />
              </button>
            )}
          </div>
        )}

        {/* Caixa de Mensagem Respondida (Quote / Reply) */}
        {(message.replyToWamid || message.replyToMessageId) && (
          <div className="mb-2 p-2 rounded-xl bg-black/5 dark:bg-white/10 border-l-4 border-emerald-600 dark:border-emerald-400 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="font-semibold block text-[10px] text-emerald-700 dark:text-emerald-400">
              {quoteAuthor ? `Mensagem de ${quoteAuthor}` : 'Mensagem citada'}
            </span>
            <span className="truncate block opacity-80" title={quotePreview}>{quotePreview}</span>
            <button type="button" onClick={() => void handleQuotedMessage()} disabled={isResolvingQuote}
              className="mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 disabled:opacity-50">
              {isResolvingQuote ? 'Localizando…' : quote ? 'Ir para a mensagem' : 'Carregar contexto citado'}
            </button>
            {quoteError && <span role="alert" className="block mt-1 text-[10px] text-red-600 dark:text-red-300">{quoteError}</span>}
          </div>
        )}

        {(message.rawPayload?.frequently_forwarded === true || message.rawPayload?.forwarded === true) && (
          <span className="mb-1 flex items-center gap-1 text-[10px] italic text-slate-500 dark:text-slate-300">
            <i className="bi bi-forward-fill" aria-hidden="true" />
            {message.rawPayload?.frequently_forwarded === true ? 'Encaminhada muitas vezes' : 'Encaminhada'}
          </span>
        )}

        {identityNotice && (
          <div role="note" aria-label="Aviso de segurança do WhatsApp" className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <i className="bi bi-shield-exclamation mt-0.5" aria-hidden="true" />
            <span>O WhatsApp incluiu uma notificação de segurança para este contato.</span>
          </div>
        )}

        {(referral || referredProduct) && (
          <div role="note" aria-label="Contexto da mensagem" className="mb-2 space-y-0.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
            {referredProduct?.product_retailer_id && <p>Produto consultado: {String(referredProduct.product_retailer_id)}</p>}
            {referral?.headline && <p className="font-semibold">Origem: {String(referral.headline)}</p>}
            {referral?.body && <p>{String(referral.body)}</p>}
            {referral?.source_type && <p>Canal: {String(referral.source_type)}</p>}
            {referral?.source_id && <p>Referência: {String(referral.source_id)}</p>}
            {referral?.source_url && <p>Link de origem: {String(referral.source_url)}</p>}
          </div>
        )}

        {/* Mídias diversas (Imagem, Documento, Áudio, Vídeo, Interativo) */}
        <MediaLoadStatus loading={isLoadingMedia} error={mediaError} onRetry={retryMedia} />
        <MessageBubbleMedia
          message={message}
          mediaUrl={mediaUrl}
          onOpenLightbox={() => setIsMediaModalOpen(true)}
        />

        {/* Texto Padrão */}
        {message.messageType === 'text' && (
          <p className="whitespace-pre-wrap break-words font-normal leading-relaxed text-[13px]">
            {message.textContent ? renderFormattedText(message.textContent) : ''}
          </p>
        )}

        {/* Rodapé do Balão: Horário e Indicadores de Entrega */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-400 select-none">
          <span>{timeFormatted}</span>

          {/* Checks de Entrega nas Mensagens Enviadas */}
          {!isInbound && (
            <MessageBubbleStatus
              status={message.status}
              failureReason={message.failureReason}
            />
          )}
        </div>
        {reactions.length > 0 && (
          <div role="list" aria-label="Reações à mensagem" className="mt-1 flex flex-wrap gap-1">
            {reactions.map((emoji, index) => (
              <span key={emoji + index} role="listitem" aria-label={'Reação ' + emoji}
                className="inline-flex min-h-6 items-center rounded-full bg-white px-1.5 text-sm shadow-sm dark:bg-slate-800">
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Avatar do Atendente (à direita em mensagens enviadas) */}
      {!isInbound && (
        <div
          title={message.authorName || 'Atendente'}
          className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs border border-emerald-700/40 mb-0.5"
        >
          {senderInitials || <i className="bi bi-person text-xs text-white"></i>}
        </div>
      )}

      {/* Lightbox para Visualização de Fotos em Tamanho Real */}
      <MediaLightboxModal
        isOpen={isMediaModalOpen}
        mediaUrl={mediaUrl}
        onClose={() => setIsMediaModalOpen(false)}
      />
    </div>
  );
};
