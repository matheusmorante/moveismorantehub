import React from 'react';
import { ConversationFilter } from '../../types';

interface InboxSectionMainProps {
  activeFilter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  totalAll: number;
  totalMine: number;
  totalUnassigned: number;
  totalUnread?: number;
  activeCustomInbox: string | null;
  activeTeam: string | null;
  onResetCustomAndTeam: () => void;
}

export const InboxSectionMain: React.FC<InboxSectionMainProps> = ({
  activeFilter,
  onFilterChange,
  totalAll,
  totalMine,
  totalUnassigned,
  totalUnread = 0,
  activeCustomInbox,
  activeTeam,
  onResetCustomAndTeam,
}) => {
  const isDefaultSelected = (targetFilter: ConversationFilter) =>
    activeFilter === targetFilter && !activeCustomInbox && !activeTeam;

  const handleSelect = (filter: ConversationFilter) => {
    onFilterChange(filter);
    onResetCustomAndTeam();
  };

  return (
    <div className="p-3 space-y-1">
      {/* Todas (All) */}
      <button
        type="button"
        onClick={() => handleSelect('all')}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          isDefaultSelected('all')
            ? 'bg-blue-600 text-white shadow-xs font-bold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <i
            className={`bi bi-inbox text-sm ${
              isDefaultSelected('all') ? 'text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          ></i>
          <span>Todas (All)</span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            isDefaultSelected('all')
              ? 'bg-white/20 text-white'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          {totalAll}
        </span>
      </button>

      {/* Minhas (Mine) */}
      <button
        type="button"
        onClick={() => handleSelect('mine')}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          isDefaultSelected('mine')
            ? 'bg-blue-600 text-white shadow-xs font-bold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <i
            className={`bi bi-person-badge text-sm ${
              isDefaultSelected('mine') ? 'text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          ></i>
          <span>Minhas (Mine)</span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            isDefaultSelected('mine')
              ? 'bg-white/20 text-white'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          {totalMine}
        </span>
      </button>

      {/* Não atribuídas (Unassigned) */}
      <button
        type="button"
        onClick={() => handleSelect('unassigned')}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          isDefaultSelected('unassigned')
            ? 'bg-blue-600 text-white shadow-xs font-bold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <i
            className={`bi bi-person-x text-sm ${
              isDefaultSelected('unassigned') ? 'text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          ></i>
          <span>Não atribuídas</span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            isDefaultSelected('unassigned')
              ? 'bg-white/20 text-white'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          {totalUnassigned}
        </span>
      </button>

      {/* Não lidas (Unread) */}
      {totalUnread > 0 && (
        <button
          type="button"
          onClick={() => handleSelect('unread')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isDefaultSelected('unread')
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <i
              className={`bi bi-chat-left-dots text-sm ${
                isDefaultSelected('unread') ? 'text-white' : 'text-emerald-500'
              }`}
            ></i>
            <span>Não lidas</span>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              isDefaultSelected('unread')
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300'
            }`}
          >
            {totalUnread}
          </span>
        </button>
      )}
    </div>
  );
};
