import React, { memo, useState } from 'react';
import type { WhatsAppMessage } from '../types';
import { useCustomerSupportMedia } from '../hooks/useCustomerSupportMedia';
import { MediaLoadStatus } from './chat/bubble/MediaLoadStatus';
import {
  renderFormattedText,
  SystemEventBubble,
  InternalNoteBubble,
  MessageBubbleStatus,
  MessageBubbleMedia,
  MediaLightboxModal,
  MessageBubbleQuotedPreview,
  MessageBubbleAiSuggestionActions,
  MessageBubbleMetaContext,
  useMessageBubbleQuoteResolution,
  MessageBubbleHeader,
  MessageBubbleDirectActions,
  MessageBubbleReactions,
  MessageBubbleAvatar,
  getInitials,
  useMessageBubbleFlags,
  isCustomerSupportAiMessage,
} from './chat/bubble';

export { getInitials, isCustomerSupportAiMessage };

export interface MessageBubbleProps {
  message: WhatsAppMessage;
  contactName?: string;
  reactions?: string[];
  quotedMessage?: WhatsAppMessage;
  isSelected?: boolean;
  onSelectMessage?: (
    message: WhatsAppMessage,
    capabilities: { canReply: boolean; canForward: boolean }
  ) => void;
  onResolveReplyTarget?: (reference: {
    conversationId: string;
    messageId: string | null;
    apiMessageId: string | null;
  }) => Promise<WhatsAppMessage | null>;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
  onReplyMessage?: (message: WhatsAppMessage) => void;
  onForwardMessage?: (message: WhatsAppMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({
  message,
  contactName,
  reactions = [],
  quotedMessage,
  isSelected = false,
  onSelectMessage,
  onResolveReplyTarget,
  onJumpToMessage,
  onReplyMessage,
  onForwardMessage,
}) => {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const {
    isInbound,
    isInternalNote,
    isSystemEvent,
    isAiMessage,
    isSuggestion,
    timeFormatted,
    canReply,
    canForward,
  } = useMessageBubbleFlags(message);

  const { mediaUrl, isLoadingMedia, mediaError, retryMedia } = useCustomerSupportMedia(
    ['image', 'document', 'audio', 'video', 'sticker', 'template'].includes(message.messageType)
      ? message.mediaId
      : null
  );

  const {
    quote,
    quoteAuthor,
    quotePreview,
    isResolvingQuote,
    quoteError,
    handleQuotedMessage,
  } = useMessageBubbleQuoteResolution({
    message,
    quotedMessage,
    contactName,
    onResolveReplyTarget,
    onJumpToMessage,
  });

  const handleMessageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelectMessage || (!canReply && !canForward)) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button, a, input, textarea, select, video, audio, img, [role="button"]')) return;
    onSelectMessage(message, { canReply, canForward });
  };

  // 1. Eventos de Sistema / Automação (Centralizados na timeline)
  if (isSystemEvent) {
    return <SystemEventBubble message={message} timeFormatted={timeFormatted} />;
  }

  // 2. Comentários Internos da Equipe ("Leaving a comment here")
  if (isInternalNote) {
    return <InternalNoteBubble message={message} timeFormatted={timeFormatted} />;
  }

  return (
    <div
      className={`flex w-full my-1.5 items-end gap-2 ${
        isInbound ? 'justify-start' : 'justify-end'
      }`}
    >
      {/* Avatar do Contato (à esquerda em mensagens recebidas) */}
      {isInbound && <MessageBubbleAvatar type="inbound" name={contactName} />}

      <div
        onClick={handleMessageClick}
        data-message-selected={isSelected || undefined}
        className={`group/message relative max-w-[85%] sm:max-w-[72%] md:max-w-[62%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs leading-relaxed select-text transition-all ${
          isInbound
            ? 'bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/50 dark:border-slate-700/50'
            : isSuggestion
              ? 'bg-amber-50/90 dark:bg-amber-950/40 text-slate-900 dark:text-slate-100 rounded-tr-xs border-2 border-dashed border-amber-400 dark:border-amber-600 shadow-md'
              : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs border border-emerald-200/60 dark:border-emerald-700/50'
        } ${onSelectMessage && (canReply || canForward) ? 'cursor-pointer' : ''} ${
          isSelected ? 'ring-2 ring-emerald-600 ring-offset-2 ring-offset-[#efeae2] dark:ring-offset-[#0b141a]' : ''
        }`}
      >
        <MessageBubbleDirectActions
          message={message}
          canReply={canReply}
          canForward={canForward}
          onReplyMessage={onReplyMessage}
          onForwardMessage={onForwardMessage}
        />

        <MessageBubbleHeader
          message={message}
          isInbound={isInbound}
          isSuggestion={isSuggestion}
          isAiMessage={isAiMessage}
        />

        {/* Caixa de Mensagem Respondida (Quote / Reply) */}
        {(message.replyToWamid || message.replyToMessageId) && (
          <MessageBubbleQuotedPreview
            quoteAuthor={quoteAuthor}
            quotePreview={quotePreview}
            quoteExists={Boolean(quote)}
            isResolvingQuote={isResolvingQuote}
            quoteError={quoteError}
            onJumpToQuoted={() => void handleQuotedMessage()}
          />
        )}

        {/* Notificações de contexto da Meta (Encaminhada, Segurança, Catálogo Ads) */}
        <MessageBubbleMetaContext message={message} />

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

        {/* Ações de Aprovação para Sugestões do Copiloto Assistido */}
        {!isInbound && isSuggestion && <MessageBubbleAiSuggestionActions message={message} />}

        {/* Rodapé do Balão: Horário e Indicadores de Entrega */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-400 select-none">
          <span>{timeFormatted}</span>
          {!isInbound && (
            <MessageBubbleStatus
              status={message.status}
              failureReason={message.failureReason}
            />
          )}
        </div>

        {/* Reações com Emojis */}
        <MessageBubbleReactions reactions={reactions} />
      </div>

      {/* Avatar do Atendente / Agente de IA (à direita em mensagens enviadas) */}
      {!isInbound && (
        <MessageBubbleAvatar
          type="outbound"
          name={message.authorName}
          isAiMessage={isAiMessage}
        />
      )}

      {/* Lightbox para Visualização de Fotos em Tamanho Real */}
      <MediaLightboxModal
        isOpen={isMediaModalOpen}
        mediaUrl={mediaUrl}
        onClose={() => setIsMediaModalOpen(false)}
      />
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
