import React from 'react';
import { ConversationFilter } from '../../types';

interface ConversationAdvancedFilterModalProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onFilterChange: (filter: ConversationFilter) => void;
}

export const ConversationAdvancedFilterModal: React.FC<ConversationAdvancedFilterModalProps> = ({
  isOpen,
  onToggle,
  onClose,
  onFilterChange,
}) => {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
      >
        <i className="bi bi-funnel text-xs"></i>
        <span>Add Filter</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-7 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-slide-down text-xs"
          onClick={onClose}
        >
          <div className="px-3.5 py-1 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
            Filtros Avançados
          </div>
          <button
            type="button"
            onClick={() => onFilterChange('with_orders')}
            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-bag-check text-purple-500"></i>
            Com pedidos de venda
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('linked')}
            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-person-check text-blue-500"></i>
            Clientes cadastrados
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('unlinked')}
            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-person-x text-amber-500"></i>
            Não identificados
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('closed')}
            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-check2-circle text-emerald-500"></i>
            Fechadas / Resolvidas
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('snoozed')}
            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-alarm text-amber-500"></i>
            Adiado (Snoozed)
          </button>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className="w-full px-3.5 py-1.5 text-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
};
