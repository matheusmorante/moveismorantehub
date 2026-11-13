import React from 'react';
import type { WhatsAppConversation, ConversationFilter, WhatsAppMessage } from '../../types';
import { ConversationSidebar, type SortOrder } from '../ConversationSidebar';

interface ConversationSidebarColumnProps {
  conversationPanelRef: React.RefObject<HTMLDivElement>;
  isMobileViewport: boolean;
  selectedConversation: WhatsAppConversation | null;
  isAiAgentChatOpen?: boolean;
  isConversationSidebarOpen: boolean;
  conversationPanelStyle: React.CSSProperties;
  conversations: WhatsAppConversation[];
  filter: ConversationFilter;
  isLoadingConversations: boolean;
  conversationsError: string | null;
  totalCount: number;
  hasMoreConversations: boolean;
  isLoadingMore: boolean;
  sortOrder: SortOrder;
  currentUserId?: string;
  canViewCommercialInfo: boolean;
  showAiHandoffBadge?: boolean;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  onJumpToMessage: (message: WhatsAppMessage) => void;
  onFilterChange: (filter: ConversationFilter) => void;
  onRefresh: () => void;
  onLoadMore: () => Promise<void>;
  onToggleConversationSidebar: () => void;
}

export const ConversationSidebarColumn: React.FC<ConversationSidebarColumnProps> = ({
  conversationPanelRef,
  isMobileViewport,
  selectedConversation,
  isAiAgentChatOpen = false,
  isConversationSidebarOpen,
  conversationPanelStyle,
  conversations,
  filter,
  isLoadingConversations,
  conversationsError,
  totalCount,
  hasMoreConversations,
  isLoadingMore,
  sortOrder,
  currentUserId,
  canViewCommercialInfo,
  showAiHandoffBadge = true,
  onSelectConversation,
  onJumpToMessage,
  onFilterChange,
  onRefresh,
  onLoadMore,
  onToggleConversationSidebar,
}) => {
  const hasOpenChat = Boolean(selectedConversation) || isAiAgentChatOpen;

  return (
    <div
      ref={conversationPanelRef}
      id="customer-support-conversations-panel"
      data-testid="customer-support-conversations-panel"
      aria-hidden={isMobileViewport ? hasOpenChat : !isConversationSidebarOpen}
      className={`relative h-full shrink-0 overflow-hidden ${
        isMobileViewport && hasOpenChat ? 'hidden' : 'flex'
      }`}
      style={conversationPanelStyle}
    >
      <ConversationSidebar
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={onSelectConversation}
        onJumpToMessage={onJumpToMessage}
        filter={filter}
        onFilterChange={onFilterChange}
        isLoading={isLoadingConversations}
        onRefresh={onRefresh}
        currentUserId={currentUserId}
        sortOrder={sortOrder}
        hasMore={hasMoreConversations}
        isLoadingMore={isLoadingMore}
        error={conversationsError ?? undefined}
        totalCount={totalCount}
        onLoadMore={onLoadMore}
        canViewCommercialInfo={canViewCommercialInfo}
        showAiHandoffBadge={showAiHandoffBadge}
        isConversationSidebarOpen={isConversationSidebarOpen}
        onToggleConversationSidebar={onToggleConversationSidebar}
        isMobileViewport={isMobileViewport}
      />
    </div>
  );
};
