import React from 'react';
import type { WhatsAppMessage } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { useCustomerSupportMessageSearch } from '../../hooks/useCustomerSupportMessageSearch';
import {
  groupMessagesByDate,
  projectVisibleMessageReactions,
  useTimelineScroll,
  TimelineDatePill,
} from './timeline';

// Re-exports para manter compatibilidade com quaisquer importadores e testes
export { groupMessagesByDate, projectVisibleMessageReactions };

interface ChatMessageTimelineProps {
  messages: WhatsAppMessage[];
  displayName: string;
  inChatSearch: string;
  searchRevision?: number;
  isLoadingMessages: boolean;
  conversationId: string;
  searchUserId?: string;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => Promise<number>;
  selectedMessageId?: string | null;
  onSelectMessage?: (
    message: WhatsAppMessage,
    capabilities: { canReply: boolean; canForward: boolean }
  ) => void;
  onResolveReplyTarget?: (reference: { conversationId: string; messageId: string | null; apiMessageId: string | null }) => Promise<WhatsAppMessage | null>;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
  jumpToMessageId?: string | null;
  onJumpComplete?: () => void;
  error?: string;
}

export const ChatMessageTimeline: React.FC<ChatMessageTimelineProps> = ({
  messages,
  displayName,
  inChatSearch,
  searchRevision = 0,
  isLoadingMessages,
  conversationId,
  searchUserId,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  error = '',
  onLoadOlderMessages,
  selectedMessageId = null,
  onSelectMessage,
  onResolveReplyTarget,
  onJumpToMessage,
  jumpToMessageId = null,
  onJumpComplete,
}) => {
  const search = useCustomerSupportMessageSearch(conversationId, inChatSearch, searchRevision, searchUserId);
  const isSearching = Boolean(inChatSearch.trim());
  const timelineMessages = isSearching ? search.messages : messages;
  const timelineError = isSearching ? search.error : error;
  const isLoadingTimeline = isSearching ? search.isLoading && search.messages.length === 0 : isLoadingMessages;

  const matchedMessages = timelineMessages;
  const filteredMessages = jumpToMessageId && !matchedMessages.some((message) => message.id === jumpToMessageId)
    ? [...matchedMessages, ...messages.filter((message) => message.id === jumpToMessageId)].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
      )
    : matchedMessages;

  const contextMessages = [...messages, ...search.messages];
  const messagesById = new Map(contextMessages.map((message) => [message.id, message]));
  const messagesByApiId = new Map(contextMessages.filter((message) => message.apiMessageId).map((message) => [message.apiMessageId as string, message]));
  const reactionProjection = projectVisibleMessageReactions(contextMessages, filteredMessages);
  const visibleTimelineMessages = filteredMessages.filter((message) => !reactionProjection.embeddedEventIds.has(message.id));

  const { timelineRef, handleTimelineScroll } = useTimelineScroll({
    conversationId,
    timelineMessages,
    isSearching,
    hasOlderMessages,
    onLoadOlderMessages,
    jumpToMessageId,
    onJumpComplete,
    filteredMessagesLength: filteredMessages.length,
  });

  const grouped = groupMessagesByDate(visibleTimelineMessages);

  return (
    <div
      ref={timelineRef}
      role="region"
      aria-label="Histórico da conversa"
      onScroll={handleTimelineScroll}
      className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 z-0"
    >
      {timelineError && (
        <p role="alert" className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-xs text-amber-800 dark:text-amber-300">
          {timelineError}
        </p>
      )}

      {!isSearching && error && hasOlderMessages && onLoadOlderMessages && (
        <button
          type="button"
          disabled={isLoadingOlderMessages}
          onClick={() => void onLoadOlderMessages()}
          className="text-xs underline text-emerald-700 dark:text-emerald-400"
        >
          Tentar carregar mensagens anteriores
        </button>
      )}

      {!isSearching && isLoadingOlderMessages && (
        <div className="sticky top-0 z-20 flex justify-center py-2 text-[11px] text-slate-500">
          <span className="rounded-full bg-white/90 dark:bg-slate-800/90 px-3 py-1 shadow-sm">
            Carregando mensagens anteriores…
          </span>
        </div>
      )}

      {isLoadingTimeline ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2">
          <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span role="status" className="text-xs text-slate-400">
            {isSearching ? 'Pesquisando mensagens…' : 'Carregando mensagens...'}
          </span>
        </div>
      ) : visibleTimelineMessages.length === 0 && !timelineError ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <i className="bi bi-chat-square-text text-3xl block mb-2 opacity-40"></i>
          {inChatSearch
            ? 'Nenhuma mensagem encontrada para a busca.'
            : 'Nenhuma mensagem registrada nesta conversa.'}
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.dateLabel} className="space-y-1.5">
            <TimelineDatePill label={group.dateLabel} />

            {group.items.map((msg) => (
              <div
                key={msg.id}
                data-message-id={msg.id}
                className={msg.id === jumpToMessageId ? 'rounded-xl ring-2 ring-emerald-500' : ''}
              >
                <MessageBubble
                  message={msg}
                  contactName={displayName}
                  reactions={msg.apiMessageId ? reactionProjection.reactionsByWamid.get(msg.apiMessageId) : undefined}
                  quotedMessage={(msg.replyToMessageId ? messagesById.get(msg.replyToMessageId) : undefined)
                    || (msg.replyToWamid ? messagesByApiId.get(msg.replyToWamid) : undefined)}
                  isSelected={msg.id === selectedMessageId}
                  onSelectMessage={onSelectMessage}
                  onResolveReplyTarget={onResolveReplyTarget}
                  onJumpToMessage={onJumpToMessage}
                />
              </div>
            ))}
          </div>
        ))
      )}

      {isSearching && (search.hasMore || search.error) && (
        <button
          type="button"
          aria-label={
            search.isLoading
              ? 'Pesquisando mensagens…'
              : search.error
                ? 'Tentar pesquisar novamente'
                : 'Carregar mais resultados'
          }
          disabled={search.isLoading}
          onClick={() => void search.loadMore()}
          className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 disabled:opacity-50"
        >
          {search.isLoading
            ? 'Pesquisando mensagens…'
            : search.error
              ? 'Tentar pesquisar novamente'
              : 'Carregar mais resultados'}
        </button>
      )}
    </div>
  );
};
