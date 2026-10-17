import React, { useState } from 'react';
import { ConversationFilter } from '../types';
import {
  InboxSectionMain,
  InboxSectionTeam,
  InboxSectionCustom,
  AddCustomInboxModal,
  CustomInboxItem,
} from './inbox';

export interface InboxSidebarProps {
  activeFilter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  totalAll: number;
  totalMine: number;
  totalUnassigned: number;
  totalUnread?: number;
  isOpen: boolean;
  onToggleCollapse: () => void;
  teams?: string[];
  activeTeam?: string | null;
  onSelectTeam?: (team: string | null) => void;
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
  teams = ['Equipe Comercial', 'Suporte ao Cliente'],
  activeTeam = null,
  onSelectTeam,
}) => {
  const [isTeamExpanded, setIsTeamExpanded] = useState(true);
  const [isCustomInboxExpanded, setIsCustomInboxExpanded] = useState(true);
  const [customInboxTab, setCustomInboxTab] = useState<'all' | 'by_me' | 'by_others'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customInboxList, setCustomInboxList] = useState<CustomInboxItem[]>([
    { id: 'my_inbox', name: 'Minha Caixa', isLocked: false },
    { id: 'custom_vip', name: 'Clientes VIP', isLocked: true },
  ]);
  const [activeCustomInbox, setActiveCustomInbox] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleAddCustomInbox = (name: string) => {
    const newId = `custom_${Date.now()}`;
    setCustomInboxList((prev) => [...prev, { id: newId, name, isLocked: false }]);
    setActiveCustomInbox(newId);
  };

  const handleResetCustomAndTeam = () => {
    setActiveCustomInbox(null);
    onSelectTeam?.(null);
  };

  return (
    <aside
      aria-label="Pastas e filas de atendimento"
      className="w-[230px] lg:w-[240px] shrink-0 border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex flex-col h-full select-none z-10 transition-all duration-200 overflow-y-auto"
    >
      {/* 1. Header: Inbox + Ações (Search e Split/Collapse) */}
      <div className="h-14 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>Inbox</span>
        </h3>

        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            type="button"
            title="Pesquisar filas"
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <i className="bi bi-search text-xs"></i>
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Recolher painel de filas"
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
            aria-label="Recolher painel de filas"
          >
            <i className="bi bi-layout-sidebar-inset text-sm"></i>
          </button>
        </div>
      </div>

      {/* 2. Filas Principais (All, Mine, Unassigned, Unread) */}
      <InboxSectionMain
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        totalAll={totalAll}
        totalMine={totalMine}
        totalUnassigned={totalUnassigned}
        totalUnread={totalUnread}
        activeCustomInbox={activeCustomInbox}
        activeTeam={activeTeam}
        onResetCustomAndTeam={handleResetCustomAndTeam}
      />

      <div className="h-px bg-slate-200/70 dark:bg-slate-800/80 mx-3 my-1" />

      {/* 3. Seção Team (Equipes) */}
      <InboxSectionTeam
        teams={teams}
        activeTeam={activeTeam}
        onSelectTeam={onSelectTeam}
        isExpanded={isTeamExpanded}
        onToggleExpand={() => setIsTeamExpanded((prev) => !prev)}
        onResetCustomInbox={() => setActiveCustomInbox(null)}
      />

      <div className="h-px bg-slate-200/70 dark:bg-slate-800/80 mx-3 my-1" />

      {/* 4. Seção Custom Inbox */}
      <InboxSectionCustom
        customInboxList={customInboxList}
        activeCustomInbox={activeCustomInbox}
        onSelectCustomInbox={setActiveCustomInbox}
        isExpanded={isCustomInboxExpanded}
        onToggleExpand={() => setIsCustomInboxExpanded((prev) => !prev)}
        customInboxTab={customInboxTab}
        onTabChange={setCustomInboxTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onResetTeam={() => onSelectTeam?.(null)}
      />

      {/* 5. Modal para Criar Pasta Personalizada com React Hook Form + zodResolver */}
      <AddCustomInboxModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddCustomInbox}
      />
    </aside>
  );
};
