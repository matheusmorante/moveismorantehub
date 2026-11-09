import React, { useState } from 'react';
import type { AssignedProfileSummary } from '../../../types';

interface ChatHeaderAssigneeDropdownProps {
  assignedTo: string | null;
  assignedName: string;
  assignedInitials: string;
  teamMembers: AssignedProfileSummary[];
  isLoadingAgents?: boolean;
  agentsError?: string | null;
  onReloadAgents?: () => void;
  currentUserId?: string;
  onAssign: (profileId: string | null) => void;
}

export const ChatHeaderAssigneeDropdown: React.FC<ChatHeaderAssigneeDropdownProps> = ({
  assignedTo,
  assignedName,
  assignedInitials,
  teamMembers,
  isLoadingAgents = false,
  agentsError = null,
  onReloadAgents,
  currentUserId,
  onAssign,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Atendente responsável pelo atendimento"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
      >
        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black uppercase">
          {assignedTo ? assignedInitials : <i className="bi bi-person"></i>}
        </div>
        <span className="max-w-[80px] sm:max-w-[100px] truncate">
          {assignedTo ? assignedName : 'Atribuir'}
        </span>
        <i className="bi bi-chevron-down text-[9px] text-slate-400"></i>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-10 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-slide-down text-xs"
          onClick={() => setIsOpen(false)}
        >
          <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
            Responsável pelo atendimento
          </div>

          {isLoadingAgents && (
            <p role="status" className="flex items-center gap-2 px-3.5 py-2 text-slate-500 dark:text-slate-400">
              <i aria-hidden="true" className="bi bi-arrow-repeat animate-spin" />
              Carregando atendentes...
            </p>
          )}

          {agentsError && (
            <div role="alert" className="px-3.5 py-2 text-red-600 dark:text-red-300">
              <p>{agentsError}</p>
              {onReloadAgents && (
                <button
                  type="button"
                  disabled={isLoadingAgents}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReloadAgents();
                  }}
                  aria-label="Tentar carregar atendentes novamente"
                  className="mt-1 underline disabled:opacity-50"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          {currentUserId && (
            <button
              type="button"
              onClick={() => onAssign(currentUserId)}
              className="w-full px-3.5 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-person-check-fill text-blue-500"></i>
              Atribuir a mim
            </button>
          )}

          <button
            type="button"
            onClick={() => onAssign(null)}
            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
          >
            <i className="bi bi-person-x text-slate-400"></i>
            Não atribuído (Fila geral)
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

          <div className="max-h-48 overflow-y-auto">
            {teamMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onAssign(m.id)}
                className={`w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                  assignedTo === m.id
                    ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/30'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[9px] font-bold">
                  {m.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="truncate flex-1">{m.fullName}</span>
                {assignedTo === m.id && (
                  <i className="bi bi-check text-blue-500 text-base"></i>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
