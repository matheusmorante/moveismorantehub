import React from 'react';

export type SortOrder = 'newest' | 'oldest' | 'unread';

export const sortLabelMap: Record<SortOrder, string> = {
  newest: 'Mais recentes',
  oldest: 'Mais antigas',
  unread: 'Não lidas primeiro',
};

interface ConversationSortMenuProps {
  sortOrder: SortOrder;
  onSortChange?: (sort: SortOrder) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const ConversationSortMenu: React.FC<ConversationSortMenuProps> = ({
  sortOrder,
  onSortChange,
  isOpen,
  onToggle,
  onClose,
}) => {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
      >
        <span>{sortLabelMap[sortOrder]}</span>
        <i className="bi bi-chevron-down text-[10px] text-slate-400"></i>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-7 w-40 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-50 animate-slide-down text-xs"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={() => onSortChange?.('newest')}
            className={`w-full px-3 py-1.5 text-left flex items-center justify-between cursor-pointer ${
              sortOrder === 'newest'
                ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>Mais recentes</span>
            {sortOrder === 'newest' && <i className="bi bi-check"></i>}
          </button>
          <button
            type="button"
            onClick={() => onSortChange?.('oldest')}
            className={`w-full px-3 py-1.5 text-left flex items-center justify-between cursor-pointer ${
              sortOrder === 'oldest'
                ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>Mais antigas</span>
            {sortOrder === 'oldest' && <i className="bi bi-check"></i>}
          </button>
          <button
            type="button"
            onClick={() => onSortChange?.('unread')}
            className={`w-full px-3 py-1.5 text-left flex items-center justify-between cursor-pointer ${
              sortOrder === 'unread'
                ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>Não lidas primeiro</span>
            {sortOrder === 'unread' && <i className="bi bi-check"></i>}
          </button>
        </div>
      )}
    </div>
  );
};
