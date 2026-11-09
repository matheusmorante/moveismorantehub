import React, { useState, useMemo } from 'react';
import { WhatsAppConversation, WhatsAppMessage, ConversationFilter } from '../types';
import { ConversationItem } from './ConversationItem';
import {
  ConversationAdvancedFilterModal,
  GlobalMessageSearch,
  ConversationListSkeleton,
  ConversationSidebarHeader,
  sortConversations,
  SortOrder,
} from './conversation';

export type { SortOrder };

export interface ConversationSidebarProps {
  conversations: WhatsAppConversation[];
  selectedConversation: WhatsAppConversation | null;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  isLoading: boolean;
  onRefresh: () => void;
  isConversationSidebarOpen?: boolean;
  onToggleConversationSidebar?: () => void;
  isMobileViewport?: boolean;
  currentUserId?: string;
  sortOrder?: SortOrder;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  totalCount?: number;
  onLoadMore?: () => Promise<void>;
  canViewCommercialInfo?: boolean;
  error?: string;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onJumpToMessage,
  filter,
  onFilterChange,
  isLoading,
  onRefresh,
  isConversationSidebarOpen = true,
  onToggleConversationSidebar,
  isMobileViewport = false,
  currentUserId,
  sortOrder = 'newest',
  hasMore = false,
  isLoadingMore = false,
  totalCount = conversations.length,
  onLoadMore,
  canViewCommercialInfo = false,
  error = '',
}) => {
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isGlobalMessageSearchOpen, setIsGlobalMessageSearchOpen] = useState(false);

  const sortedConversations = useMemo(
    () => sortConversations(conversations, sortOrder),
    [conversations, sortOrder]
  );

  return (
    <div className="w-full min-w-0 border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col h-full shrink-0 select-none transition-colors">
      {/* 1. Header: escopo, pesquisa e recolhimento da própria lista */}
      <ConversationSidebarHeader
        isGlobalMessageSearchOpen={isGlobalMessageSearchOpen}
        setIsGlobalMessageSearchOpen={setIsGlobalMessageSearchOpen}
        filter={filter}
        onFilterChange={onFilterChange}
        isScopeMenuOpen={isScopeMenuOpen}
        setIsScopeMenuOpen={setIsScopeMenuOpen}
        isMobileViewport={isMobileViewport}
        isConversationSidebarOpen={isConversationSidebarOpen}
        onToggleConversationSidebar={onToggleConversationSidebar}
      />

      <GlobalMessageSearch
        isVisible={isGlobalMessageSearchOpen}
        userId={currentUserId}
        onSelectConversation={onSelectConversation}
        onJumpToMessage={onJumpToMessage}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {/* 2. Header Row 2: filtros avançados */}
        <div className="px-3.5 py-2 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/70 dark:bg-slate-900/70">
          <ConversationAdvancedFilterModal
            isOpen={isFilterModalOpen}
            onToggle={() => setIsFilterModalOpen((prev) => !prev)}
            onClose={() => setIsFilterModalOpen(false)}
            onFilterChange={onFilterChange}
            canViewCommercialInfo={canViewCommercialInfo}
          />
        </div>

        {/* 3. Lista de Conversas com Cards Arredondados */}
        {error && (
          <div role="alert" className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <span className="min-w-0">{error}</span>
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={isLoading}
              className="shrink-0 rounded-md px-2 py-1 font-semibold hover:bg-amber-100 disabled:opacity-50 dark:hover:bg-amber-950/40"
            >
              {isLoading ? 'Atualizando…' : 'Tentar novamente'}
            </button>
          </div>
        )}
        <div
          role="region"
          aria-label="Lista de conversas"
          className="flex-1 overflow-y-auto py-2"
          onScroll={(event) => {
            const container = event.currentTarget;
            if (hasMore && !isLoadingMore && onLoadMore && container.scrollHeight - container.scrollTop - container.clientHeight < 140) {
              void onLoadMore();
            }
          }}
        >
          {!error && (
            <ConversationListSkeleton
              isLoading={isLoading}
              count={sortedConversations.length}
              search=""
            />
          )}

          {sortedConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedConversation?.id === conv.id}
              onSelect={onSelectConversation}
            />
          ))}
          {isLoadingMore && (
            <div role="status" className="py-3 text-center text-xs text-slate-400">
              Carregando mais conversas…
            </div>
          )}
          {!isLoading && !isLoadingMore && sortedConversations.length > 0 && (
            <p className="py-2 text-center text-[10px] text-slate-400">
              {sortedConversations.length} de {totalCount} conversas
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
