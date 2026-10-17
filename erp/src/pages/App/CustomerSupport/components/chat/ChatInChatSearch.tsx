import React from 'react';

interface ChatInChatSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
}

export const ChatInChatSearch: React.FC<ChatInChatSearchProps> = ({
  searchQuery,
  onSearchChange,
  onClose,
}) => {
  return (
    <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-2 z-10 animate-slide-down">
      <i className="bi bi-search text-slate-400 text-xs"></i>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Pesquisar nesta conversa..."
        autoFocus
        className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 border-none focus:outline-none"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          title="Limpar pesquisa"
        >
          <i className="bi bi-x-circle-fill text-xs"></i>
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-2 cursor-pointer"
      >
        Fechar
      </button>
    </div>
  );
};
