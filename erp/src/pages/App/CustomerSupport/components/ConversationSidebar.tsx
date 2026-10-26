import React, { useState, useMemo } from 'react';
import { WhatsAppConversation, WhatsAppMessage, ConversationFilter } from '../types';
import { ConversationItem } from './ConversationItem';
import {
  ConversationScopeMenu,
  ConversationSortMenu,
  ConversationAdvancedFilterModal,
  GlobalMessageSearch,
  ConversationListSkeleton,
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
  onSortChange?: (sort: SortOrder) => void;
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
  onSortChange,
  hasMore = false,
  isLoadingMore = false,
  totalCount = conversations.length,
  onLoadMore,
  canViewCommercialInfo = false,
  error = '',
}) => {
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isGlobalMessageSearchOpen, setIsGlobalMessageSearchOpen] = useState(false);

  // Ordenação das conversas
  const sortedConversations = useMemo(() => {
    const list = [...conversations];
    if (sortOrder === 'unread') {
      return list.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    if (sortOrder === 'oldest') {
      return list.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeA - timeB;
      });
    }

    // Default 'newest'
    return list.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [conversations, sortOrder]);

  return (
    <div className="w-full min-w-0 border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col h-full shrink-0 select-none transition-colors">
      {/* 1. Header: escopo, pesquisa e recolhimento da própria lista */}
      <div className="h-14 px-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
        {isGlobalMessageSearchOpen ? (
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Busca global</h2>
        ) : (
          <ConversationScopeMenu
            filter={filter}
            onFilterChange={onFilterChange}
            isOpen={isScopeMenuOpen}
            onToggle={() => setIsScopeMenuOpen((prev) => !prev)}
            onClose={() => setIsScopeMenuOpen(false)}
          />
        )}

        {/* Pesquisa já cobre a lista; a recuperação manual aparece somente em erro. */}
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setIsGlobalMessageSearchOpen((prev) => !prev)}
            aria-label="Pesquisar mensagens em todas as conversas"
            title="Pesquisar mensagens em todas as conversas"
            aria-pressed={isGlobalMessageSearchOpen}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isGlobalMessageSearchOpen
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden="true">
              <i className="bi bi-chat-square-text text-[13px]" />
              <i className="bi bi-search absolute -bottom-0.5 -right-1 rounded-full bg-white text-[8px] dark:bg-slate-900" />
            </span>
          </button>
          {!isMobileViewport && onToggleConversationSidebar && (
            <button
              type="button"
              onClick={onToggleConversationSidebar}
              title="Recolher lista de conversas"
              aria-label="Recolher lista de conversas"
              aria-expanded={isConversationSidebarOpen}
              aria-controls="customer-support-conversations-panel"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <i className="bi bi-layout-sidebar-inset text-xs" />
            </button>
          )}
        </div>
      </div>

      <GlobalMessageSearch
        isVisible={isGlobalMessageSearchOpen}
        userId={currentUserId}
        onSelectConversation={onSelectConversation}
        onJumpToMessage={onJumpToMessage}
      />

      <div className={isGlobalMessageSearchOpen ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
        {/* 2. Header Row 2: ordenação e filtros avançados */}
        <div className="px-3.5 py-2 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/70 dark:bg-slate-900/70">
          <ConversationSortMenu
            sortOrder={sortOrder}
            onSortChange={onSortChange}
            isOpen={isSortMenuOpen}
            onToggle={() => setIsSortMenuOpen((prev) => !prev)}
            onClose={() => setIsSortMenuOpen(false)}
          />

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
        {!error && <ConversationListSkeleton
          isLoading={isLoading}
          count={sortedConversations.length}
          search=""
        />}

        {sortedConversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isSelected={selectedConversation?.id === conv.id}
            onSelect={onSelectConversation}
          />
        ))}
        {isLoadingMore && <div role="status" className="py-3 text-center text-xs text-slate-400">Carregando mais conversas…</div>}
        {!isLoading && !isLoadingMore && sortedConversations.length > 0 && (
          <p className="py-2 text-center text-[10px] text-slate-400">{sortedConversations.length} de {totalCount} conversas</p>
        )}
      </div>
      </div>
    </div>
  );
};
