import React from 'react';
import { AssignedProfileSummary } from '../../types';

interface InboxSectionTeamProps {
  agents: AssignedProfileSummary[];
  activeAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const InboxSectionTeam: React.FC<InboxSectionTeamProps> = ({
  agents,
  activeAgentId,
  onSelectAgent,
  isExpanded,
  onToggleExpand,
  isLoading = false,
  error = null,
  onRetry,
}) => (
  <div className="p-3">
    <button type="button" aria-label="Atendentes" aria-expanded={isExpanded} onClick={onToggleExpand} className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2">
      <span className="flex items-center gap-2"><i className="bi bi-people text-sm" /><span>Atendentes</span></span>
      <i className={`bi bi-chevron-down text-[10px] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
    </button>
    {isExpanded && (
      <div className="space-y-1 pl-2 animate-fade-in text-xs">
        {isLoading && <p role="status" className="flex items-center gap-2 px-2 py-2 text-slate-500 dark:text-slate-400"><i aria-hidden="true" className="bi bi-arrow-repeat animate-spin" />Carregando atendentes...</p>}
        {error && <div role="alert" className="px-2 py-2 text-red-600 dark:text-red-300">
          <p>{error}</p>
          {onRetry && <button type="button" disabled={isLoading} onClick={onRetry} aria-label="Tentar carregar atendentes novamente" className="mt-1 underline disabled:opacity-50">Tentar novamente</button>}
        </div>}
        {agents.length === 0 ? (
          !isLoading && !error && <p className="text-[11px] text-slate-400 italic px-2 py-1">Nenhum atendente autorizado encontrado.</p>
        ) : agents.map((agent) => (
          <button key={agent.id} type="button" aria-pressed={activeAgentId === agent.id} onClick={() => onSelectAgent(activeAgentId === agent.id ? null : agent.id)} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left ${activeAgentId === agent.id ? 'bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[9px] font-bold">{agent.fullName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
            <span className="truncate flex-1">{agent.fullName}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);
