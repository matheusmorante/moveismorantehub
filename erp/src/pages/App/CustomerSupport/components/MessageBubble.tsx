import React, { memo, useState } from 'react';
import type { WhatsAppMessage } from '../types';
import { getCatalogProductCardIds, type CatalogInteractiveProductCard } from '../catalogInteractiveProducts';
import type { CustomerSupportSendResult } from '@/pages/utils/customerSupport/customerSupportService';
import { useCustomerSupportMedia } from '../hooks/useCustomerSupportMedia';
import { isMetaSocialMediaUrl } from '@/pages/utils/customerSupport/socialMediaUrl';
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
  catalogProductCards?: Record<string, CatalogInteractiveProductCard>;
  loadingCatalogRetailerIds?: ReadonlySet<string>;
  contactName?: string;
  reactions?: string[];
  quotedMessage?: WhatsAppMessage;
  isSelected?: boolean;
  canSelectForActions?: boolean;
  isMessageSelectionMode?: boolean;
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
  onApproveAiSuggestion?: (message: WhatsAppMessage) => Promise<CustomerSupportSendResult>;
  aiSuggestionAuthorName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({
  message,
  catalogProductCards,
  loadingCatalogRetailerIds,
  contactName,
  reactions = [],
  quotedMessage,
  isSelected = false,
  canSelectForActions = true,
  isMessageSelectionMode = false,
  onSelectMessage,
  onResolveReplyTarget,
  onJumpToMessage,
  onReplyMessage,
  onForwardMessage,
  onApproveAiSuggestion,
  aiSuggestionAuthorName,
}) => {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [acceptedAiSuggestionLocally, setAcceptedAiSuggestionLocally] = useState(false);
  const [acceptedAiSuggestionWarning, setAcceptedAiSuggestionWarning] = useState('');
  const isPersistedAiSuggestionAccepted = message.rawPayload?.accepted_ai_suggestion === true;
  const displayMessage = acceptedAiSuggestionLocally && !isPersistedAiSuggestionAccepted
    ? {
        ...message,
        status: 'sent' as const,
        authorName: aiSuggestionAuthorName || 'Atendente',
        rawPayload: {
          ...message.rawPayload,
          origin: 'customer_support_composer',
          is_ai: false,
          is_suggestion: false,
          accepted_ai_suggestion: true,
        },
      }
    : message;

  const {
    isInbound,
    isInternalNote,
    isSystemEvent,
    isReactionMessage,
    isNonChatEvent,
    isAiMessage,
    isSuggestion,
    timeFormatted,
    canReply,
    canForward,
  } = useMessageBubbleFlags(displayMessage);
  const canSelectForCopy = message.messageType === 'text' && Boolean(message.textContent?.trim());
  const canSelectForAction = canSelectForActions && (canReply || canForward);
  const canSelectForDelete = canSelectForActions && message.messageType !== 'deleted' && !isReactionMessage && !isNonChatEvent;
  const isCatalogMessage = getCatalogProductCardIds(displayMessage).length > 0;
  const isOutboundVisualMedia = !isInbound && ['image', 'video', 'sticker'].includes(displayMessage.messageType);

  const {
    mediaUrl: fetchedMediaUrl,
    isLoadingMedia: isFetchingMedia,
    mediaError,
    retryMedia,
  } = useCustomerSupportMedia(
    ['image', 'document', 'audio', 'video', 'sticker', 'template'].includes(displayMessage.messageType)
      ? displayMessage.mediaId
      : null
  );
  const mediaUrl = isMetaSocialMediaUrl(displayMessage.mediaUrl)
    ? displayMessage.mediaUrl
    : fetchedMediaUrl;
  const isLoadingMedia = !displayMessage.mediaUrl && isFetchingMedia;

  const {
    quote,
    quoteAuthor,
    quotePreview,
    isResolvingQuote,
    quoteError,
    handleQuotedMessage,
  } = useMessageBubbleQuoteResolution({
    message: displayMessage,
    quotedMessage,
    contactName,
    onResolveReplyTarget,
    onJumpToMessage,
  });

  const handleMessageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelectMessage || (!canSelectForAction && !canSelectForCopy)) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button, a, input, textarea, select, video, audio, [role="button"]')) return;
    if (!isCatalogMessage && target?.closest('img')) return;
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
        data-catalog-message={isCatalogMessage || undefined}
        className={`group/message relative min-w-0 text-xs leading-relaxed select-text transition-all ${
          isCatalogMessage
            ? 'w-fit max-w-full rounded-xl text-slate-800 dark:text-slate-100'
            : `max-w-[85%] sm:max-w-[72%] md:max-w-[62%] rounded-2xl ${isOutboundVisualMedia ? 'p-1' : 'px-3.5 py-2.5'} shadow-xs ${
              isInbound
                ? 'bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/50 dark:border-slate-700/50'
                : isSuggestion
                  ? 'bg-orange-50/95 dark:bg-orange-950/40 text-slate-900 dark:text-slate-100 rounded-tr-xs border-2 border-dashed border-orange-400 dark:border-orange-600 shadow-md'
                  : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-xs border border-emerald-200/60 dark:border-emerald-700/50'
            }`
        } ${onSelectMessage && (canSelectForAction || canSelectForCopy) ? 'cursor-pointer' : ''} ${
          isSelected ? 'ring-2 ring-emerald-600 ring-offset-2 ring-offset-[#efeae2] dark:ring-offset-[#0b141a]' : ''
        }`}
      >
        {isMessageSelectionMode && canSelectForDelete && (
          <label
            onClick={(event) => event.stopPropagation()}
            className="absolute -left-5 -top-5 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelectMessage?.(message, { canReply, canForward })}
              aria-label={`${isSelected ? 'Desmarcar' : 'Selecionar'} mensagem de ${timeFormatted || 'horário desconhecido'}`}
              className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
            />
          </label>
        )}

        <MessageBubbleDirectActions
          message={displayMessage}
          canReply={canReply}
          canForward={canForward}
          onReplyMessage={onReplyMessage}
          onForwardMessage={onForwardMessage}
        />

        <MessageBubbleHeader
          message={displayMessage}
          isInbound={isInbound}
          isSuggestion={isSuggestion}
          isAiMessage={isAiMessage}
        />

        {/* Caixa de Mensagem Respondida (Quote / Reply) */}
        {(displayMessage.replyToWamid || displayMessage.replyToMessageId) && (
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
        <MessageBubbleMetaContext message={displayMessage} />

        {/* Mídias diversas (Imagem, Documento, Áudio, Vídeo, Interativo) */}
        <MediaLoadStatus loading={isLoadingMedia} error={mediaError} onRetry={retryMedia} />
        <MessageBubbleMedia
          message={displayMessage}
          mediaUrl={mediaUrl}
          onOpenLightbox={() => setIsMediaModalOpen(true)}
          catalogProductCards={catalogProductCards}
          loadingCatalogRetailerIds={loadingCatalogRetailerIds}
        />

        {/* Texto Padrão */}
        {displayMessage.messageType === 'text' && (
          <p className="whitespace-pre-wrap break-words font-normal leading-relaxed text-[13px]">
            {displayMessage.textContent ? renderFormattedText(displayMessage.textContent) : ''}
          </p>
        )}

        {/* Ações de Aprovação para Sugestões do Copiloto Assistido */}
        {!isInbound && isSuggestion && displayMessage.status === 'suggested' && onApproveAiSuggestion && (
          <MessageBubbleAiSuggestionActions
            message={message}
            onApprove={onApproveAiSuggestion}
            onAccepted={(result) => {
              setAcceptedAiSuggestionLocally(true);
              setAcceptedAiSuggestionWarning(result.warning || '');
            }}
          />
        )}

        {displayMessage.rawPayload?.accepted_ai_suggestion === true && (
          <div className="mt-1 flex flex-col items-end gap-0.5 text-[10px] leading-tight text-amber-700 dark:text-amber-300">
            <span><i className="bi bi-stars mr-1" aria-hidden="true" />Escrito por sugestão de IA</span>
            {acceptedAiSuggestionWarning && (
              <span role="status" className="max-w-64 text-right text-slate-500 dark:text-slate-400">{acceptedAiSuggestionWarning}</span>
            )}
          </div>
        )}

        {/* Rodapé do Balão: Horário e Indicadores de Entrega */}
        <div className={`flex items-center justify-end gap-1 ${isOutboundVisualMedia ? 'mt-0.5' : 'mt-1'} text-[10px] select-none ${
          isCatalogMessage ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-400'
        }`}>
          <span>{timeFormatted}</span>
          {!isInbound && (
            <MessageBubbleStatus
              status={displayMessage.status}
              failureReason={displayMessage.failureReason}
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
          name={displayMessage.authorName}
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
