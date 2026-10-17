import React, { useState, useMemo } from 'react';
import { WhatsAppConversation, ConversationFilter } from '../types';
import { ConversationItem } from './ConversationItem';
import { FreeTierUsageInfo } from '@/pages/utils/customerSupport/freeTierTracker';
import {
  ConversationScopeMenu,
  ConversationSortMenu,
  ConversationAdvancedFilterModal,
  ConversationSearchBar,
  ConversationListSkeleton,
  SortOrder,
} from './conversation';

export type { SortOrder };

export interface ConversationSidebarProps {
  conversations: WhatsAppConversation[];
  selectedConversation: WhatsAppConversation | null;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  usageInfo: FreeTierUsageInfo | null;
  onOpenUsageModal: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  currentUserId?: string;
  sortOrder?: SortOrder;
  onSortChange?: (sort: SortOrder) => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  usageInfo,
  onOpenUsageModal,
  isLoading,
  onRefresh,
  sortOrder = 'newest',
  onSortChange,
}) => {
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);

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
    <div className="w-full md:w-[340px] lg:w-[370px] border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col h-full shrink-0 select-none transition-colors">
      {/* 1. Header Row 1: Escopo Dropdown "(Q) All ▾" + Ações (SLA/Configurações + Busca) */}
      <div className="h-14 px-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
        <ConversationScopeMenu
          filter={filter}
          onFilterChange={onFilterChange}
          isOpen={isScopeMenuOpen}
          onToggle={() => setIsScopeMenuOpen((prev) => !prev)}
          onClose={() => setIsScopeMenuOpen(false)}
        />

        {/* Ações da direita: SLA / Regras, Busca e Atualizar */}
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={onOpenUsageModal}
            title="Consumo de Franquia Meta / SLA"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <i className="bi bi-sliders text-xs"></i>
          </button>

          <button
            type="button"
            onClick={() => setIsSearchBarVisible((prev) => !prev)}
            title="Alternar campo de busca"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isSearchBarVisible || search
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <i className="bi bi-search text-xs"></i>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            title="Atualizar lista de conversas agora (sincronização automática ativa)"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <i className={`bi bi-arrow-clockwise text-xs ${isLoading ? 'animate-spin text-emerald-500' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* 2. Header Row 2: Sort "Newest ▾" e Botão "+ Add Filter" */}
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
        />
      </div>

      {/* 3. Barra de Busca Expandível */}
      <ConversationSearchBar
        isVisible={isSearchBarVisible}
        search={search}
        onSearchChange={onSearchChange}
      />

      {/* 4. Lista de Conversas com Cards Arredondados */}
      <div className="flex-1 overflow-y-auto py-2">
        <ConversationListSkeleton
          isLoading={isLoading}
          count={sortedConversations.length}
          search={search}
        />

        {sortedConversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isSelected={selectedConversation?.id === conv.id}
            onSelect={onSelectConversation}
          />
        ))}
      </div>
    </div>
  );
};
