import React from 'react';
import { ConversationFilter } from '../../types';

export const SCOPE_OPTIONS: { id: ConversationFilter; label: string; activeLabel: string }[] = [
  { id: 'all', label: 'Todas', activeLabel: 'Todas' },
  { id: 'mine', label: 'Minhas', activeLabel: 'Minhas' },
  { id: 'unassigned', label: 'Não atribuídas', activeLabel: 'Sem atribuição' },
  { id: 'unread', label: 'Não lidas', activeLabel: 'Não lidas' },
  { id: 'closed', label: 'Fechadas', activeLabel: 'Fechadas' },
  { id: 'snoozed', label: 'Adiadas', activeLabel: 'Adiadas' },
];

interface ConversationScopeMenuProps {
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const ConversationScopeMenu: React.FC<ConversationScopeMenuProps> = ({
  filter,
  onFilterChange,
  isOpen,
  onToggle,
  onClose,
}) => {
  const activeScopeLabel = SCOPE_OPTIONS.find((scope) => scope.id === filter)?.activeLabel || 'Todas';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
      >
        <i className="bi bi-chat-left-text text-slate-500 text-xs"></i>
        <span>{activeScopeLabel}</span>
        <i className="bi bi-chevron-down text-[10px] text-slate-400"></i>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-10 w-52 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-slide-down text-xs"
          onClick={onClose}
        >
          <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
            Filtro de Escopo
          </div>
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={`w-full px-3.5 py-2 text-left flex items-center justify-between cursor-pointer ${
                filter === opt.id
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{opt.label}</span>
              {filter === opt.id && <i className="bi bi-check text-blue-600"></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
