import React, { useState } from 'react';
import { ConversationFilter, AssignedProfileSummary } from '../types';
import { InboxSectionMain, InboxSectionTeam } from './inbox';

export interface InboxSidebarProps {
  activeFilter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  totalAll: number;
  totalMine: number;
  totalUnassigned: number;
  totalUnread?: number;
  onToggleCollapse: () => void;
  agents: AssignedProfileSummary[];
  isLoadingAgents?: boolean;
  agentsError?: string | null;
  onReloadAgents?: () => void;
  activeAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
}

export const InboxSidebar: React.FC<InboxSidebarProps> = ({
  activeFilter,
  onFilterChange,
  totalAll,
  totalMine,
  totalUnassigned,
  totalUnread = 0,
  onToggleCollapse,
  agents,
  isLoadingAgents,
  agentsError,
  onReloadAgents,
  activeAgentId,
  onSelectAgent,
}) => {
  const [isTeamExpanded, setIsTeamExpanded] = useState(true);

  return (
    <aside aria-label="Filas e atendentes" className="w-full min-w-0 shrink-0 border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex flex-col h-full select-none z-10 overflow-y-auto">
      <div className="h-14 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Caixa de entrada</h3>
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button type="button" onClick={onToggleCollapse} title="Recolher painel de filas" aria-label="Recolher painel de filas" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><i className="bi bi-layout-sidebar-inset text-sm" /></button>
        </div>
      </div>

      <InboxSectionMain
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        totalAll={totalAll}
        totalMine={totalMine}
        totalUnassigned={totalUnassigned}
        totalUnread={totalUnread}
        activeTeam={activeAgentId}
      />
      <div className="h-px bg-slate-200/70 dark:bg-slate-800/80 mx-3 my-1" />
      <InboxSectionTeam
        agents={agents}
        isLoading={isLoadingAgents}
        error={agentsError}
        onRetry={onReloadAgents}
        activeAgentId={activeAgentId}
        onSelectAgent={onSelectAgent}
        isExpanded={isTeamExpanded}
        onToggleExpand={() => setIsTeamExpanded((expanded) => !expanded)}
      />
    </aside>
  );
};
