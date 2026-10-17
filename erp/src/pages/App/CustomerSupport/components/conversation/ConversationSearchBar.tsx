import React from 'react';

interface ConversationSearchBarProps {
  isVisible: boolean;
  search: string;
  onSearchChange: (search: string) => void;
}

export const ConversationSearchBar: React.FC<ConversationSearchBarProps> = ({
  isVisible,
  search,
  onSearchChange,
}) => {
  if (!isVisible && !search) return null;

  return (
    <div className="p-2 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 animate-slide-down">
      <div className="relative flex items-center">
        <i className="bi bi-search absolute left-3 text-slate-400 text-xs"></i>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Pesquisar por cliente, telefone ou pedido..."
          autoFocus
          className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500/60 focus:outline-none transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Limpar pesquisa"
          >
            <i className="bi bi-x-circle-fill text-xs"></i>
          </button>
        )}
      </div>
    </div>
  );
};
