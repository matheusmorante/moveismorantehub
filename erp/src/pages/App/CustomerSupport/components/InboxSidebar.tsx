import React, { useMemo, useState } from 'react';
import { ConversationFilter, AssignedProfileSummary, CustomerSupportFolder, CustomerSupportFolderCriteria } from '../types';
import { InboxSectionMain, InboxSectionTeam, InboxSectionCustom, AddCustomInboxModal } from './inbox';
import type { TestArtifactIdentity } from '../../../../../../shared-utils/testArtifactPolicy';
import { getTestArtifactContext } from '../../../../../../shared-utils/testArtifactContext';

export interface InboxSidebarProps {
  activeFilter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  totalAll: number;
  totalMine: number;
  totalUnassigned: number;
  totalUnread?: number;
  isOpen: boolean;
  onToggleCollapse: () => void;
  agents: AssignedProfileSummary[];
  activeAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  folders: CustomerSupportFolder[];
  selectedFolder: CustomerSupportFolder | null;
  currentUserId?: string;
  onSelectFolder: (folder: CustomerSupportFolder) => void;
  onClearFolder: () => void;
  onSaveFolder: (name: string, criteria: CustomerSupportFolderCriteria, folderId?: string) => Promise<string | null>;
  onDeleteFolder: (folder: CustomerSupportFolder) => void;
  canViewCommercialInfo: boolean;
  testIdentity?: TestArtifactIdentity | null;
}

export const InboxSidebar: React.FC<InboxSidebarProps> = ({
  activeFilter,
  onFilterChange,
  totalAll,
  totalMine,
  totalUnassigned,
  totalUnread = 0,
  isOpen,
  onToggleCollapse,
  agents,
  activeAgentId,
  onSelectAgent,
  folders,
  selectedFolder,
  currentUserId,
  onSelectFolder,
  onClearFolder,
  onSaveFolder,
  onDeleteFolder,
  canViewCommercialInfo,
  testIdentity,
}) => {
  const [isTeamExpanded, setIsTeamExpanded] = useState(true);
  const [isCustomInboxExpanded, setIsCustomInboxExpanded] = useState(true);
  const [customInboxTab, setCustomInboxTab] = useState<'all' | 'by_me' | 'by_others'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<CustomerSupportFolder | null>(null);
  const [formTestIdentity, setFormTestIdentity] = useState<TestArtifactIdentity | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');

  const visibleFolders = useMemo(() => {
    const term = queueSearch.trim().toLocaleLowerCase();
    return folders.filter((folder) => !term || folder.name.toLocaleLowerCase().includes(term));
  }, [folders, queueSearch]);
  const visibleAgents = useMemo(() => {
    const term = queueSearch.trim().toLocaleLowerCase();
    return agents.filter((agent) => !term || agent.fullName.toLocaleLowerCase().includes(term));
  }, [agents, queueSearch]);

  if (!isOpen) return null;

  const resetFolderAndAgent = () => {
    onSelectAgent(null);
    onClearFolder();
  };

  const openCreateFolder = () => {
    const currentIdentity = testIdentity ? getTestArtifactContext() : null;
    setFormTestIdentity(currentIdentity?.ownerId === currentUserId ? currentIdentity : null);
    setFolderToEdit(null);
    setIsAddModalOpen(true);
  };

  const openEditFolder = (folder: CustomerSupportFolder) => {
    const currentIdentity = testIdentity ? getTestArtifactContext() : null;
    setFormTestIdentity(currentIdentity?.ownerId === currentUserId ? currentIdentity : null);
    setFolderToEdit(folder);
    setIsAddModalOpen(true);
  };

  return (
    <aside aria-label="Pastas e filas de atendimento" className="w-[230px] lg:w-[240px] shrink-0 border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex flex-col h-full select-none z-10 transition-all duration-200 overflow-y-auto">
      <div className="h-14 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Inbox</h3>
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button type="button" onClick={() => setIsSearchOpen((open) => !open)} title="Pesquisar filas e atendentes" aria-label="Pesquisar filas e atendentes" className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-800 ${isSearchOpen ? 'text-blue-600' : ''}`}><i className="bi bi-search text-xs" /></button>
          <button type="button" onClick={onToggleCollapse} title="Recolher painel de filas" aria-label="Recolher painel de filas" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><i className="bi bi-layout-sidebar-inset text-sm" /></button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="px-3 pt-3">
          <input autoFocus type="search" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} aria-label="Pesquisar pastas e atendentes" placeholder="Pesquisar filas…" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      )}

      <InboxSectionMain
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        totalAll={totalAll}
        totalMine={totalMine}
        totalUnassigned={totalUnassigned}
        totalUnread={totalUnread}
        activeCustomInbox={selectedFolder?.id || null}
        activeTeam={activeAgentId}
        onResetCustomAndTeam={resetFolderAndAgent}
      />
      <div className="h-px bg-slate-200/70 dark:bg-slate-800/80 mx-3 my-1" />
      <InboxSectionTeam
        agents={visibleAgents}
        activeAgentId={activeAgentId}
        onSelectAgent={(agentId) => {
          onSelectAgent(agentId);
          onClearFolder();
          if (agentId) setCustomInboxTab('all');
        }}
        isExpanded={isTeamExpanded}
        onToggleExpand={() => setIsTeamExpanded((expanded) => !expanded)}
      />
      <div className="h-px bg-slate-200/70 dark:bg-slate-800/80 mx-3 my-1" />
      <InboxSectionCustom
        folders={visibleFolders}
        activeFolderId={selectedFolder?.id || null}
        currentUserId={currentUserId}
        onSelectFolder={onSelectFolder}
        onEditFolder={openEditFolder}
        onDeleteFolder={onDeleteFolder}
        isExpanded={isCustomInboxExpanded}
        onToggleExpand={() => setIsCustomInboxExpanded((expanded) => !expanded)}
        customInboxTab={customInboxTab}
        onTabChange={setCustomInboxTab}
        onOpenAddModal={openCreateFolder}
      />
      <AddCustomInboxModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        agents={agents}
        canViewCommercialInfo={canViewCommercialInfo}
        testIdentity={formTestIdentity}
        folder={folderToEdit}
        onSave={onSaveFolder}
      />
    </aside>
  );
};
