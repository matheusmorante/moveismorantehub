import React from 'react';
import type { ConversationFilter } from '../types';
import { ConversationScopeMenu } from './ConversationScopeMenu';

interface ConversationSidebarHeaderProps {
  isGlobalMessageSearchOpen: boolean;
  setIsGlobalMessageSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  isScopeMenuOpen: boolean;
  setIsScopeMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileViewport?: boolean;
  isConversationSidebarOpen?: boolean;
  onToggleConversationSidebar?: () => void;
}

export const ConversationSidebarHeader: React.FC<ConversationSidebarHeaderProps> = ({
  isGlobalMessageSearchOpen,
  setIsGlobalMessageSearchOpen,
  filter,
  onFilterChange,
  isScopeMenuOpen,
  setIsScopeMenuOpen,
  isMobileViewport = false,
  isConversationSidebarOpen = true,
  onToggleConversationSidebar,
}) => {
  return (
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
  );
};
