import React from 'react';
import type { AssignedProfileSummary, ConversationFilter } from '../../types';
import { InboxSidebar } from '../InboxSidebar';
import { CustomerSupportResizeHandle } from '../CustomerSupportResizeHandle';
import { CUSTOMER_SUPPORT_LAYOUT_DEFAULTS } from '../../customerSupportLayoutPreferences';

interface InboxSidebarColumnProps {
  inboxPanelRef: React.RefObject<HTMLDivElement | null>;
  supportLayoutRef: React.RefObject<HTMLDivElement | null>;
  conversationPanelRef: React.RefObject<HTMLDivElement | null>;
  inboxPanelVisible: boolean;
  inboxPanelStyle: React.CSSProperties;
  isInboxSidebarOpen: boolean;
  inboxSidebarWidth: number;
  filter: ConversationFilter;
  totalAll: number;
  mineCountTotal: number;
  unassignedCountTotal: number;
  unreadCountTotal: number;
  agents: AssignedProfileSummary[];
  isLoadingAgents: boolean;
  agentsError: string | null;
  activeAgentId: string | null;
  onFilterChange: (filter: ConversationFilter) => void;
  onCloseInboxPanel: () => void;
  onReloadAgents: () => void;
  onSelectAgent: (agentId: string | null) => void;
  setInboxSidebarWidth: (width: number) => void;
  setIsInboxSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsDraggingSupportPanel: (dragging: boolean) => void;
  onDeleteFolder?: (folder: any) => void;
  InboxSidebarComponent?: React.ComponentType<any>;
}

export const InboxSidebarColumn: React.FC<InboxSidebarColumnProps> = ({
  inboxPanelRef,
  supportLayoutRef,
  conversationPanelRef,
  inboxPanelVisible,
  inboxPanelStyle,
  isInboxSidebarOpen,
  inboxSidebarWidth,
  filter,
  totalAll,
  mineCountTotal,
  unassignedCountTotal,
  unreadCountTotal,
  agents,
  isLoadingAgents,
  agentsError,
  activeAgentId,
  onFilterChange,
  onCloseInboxPanel,
  onReloadAgents,
  onSelectAgent,
  setInboxSidebarWidth,
  setIsInboxSidebarOpen,
  setIsDraggingSupportPanel,
  onDeleteFolder,
  InboxSidebarComponent,
}) => {
  const SidebarComponent = InboxSidebarComponent || InboxSidebar;
  return (
    <>
      <div
        ref={inboxPanelRef}
        id="customer-support-inbox-panel"
        data-testid="customer-support-inbox-panel"
        aria-hidden={!inboxPanelVisible}
        className="h-full shrink-0 overflow-hidden"
        style={inboxPanelStyle}
      >
        <SidebarComponent
          activeFilter={filter}
          onFilterChange={onFilterChange}
          totalAll={totalAll}
          totalMine={mineCountTotal}
          totalUnassigned={unassignedCountTotal}
          totalUnread={unreadCountTotal}
          onToggleCollapse={onCloseInboxPanel}
          agents={agents}
          isLoadingAgents={isLoadingAgents}
          agentsError={agentsError}
          onReloadAgents={onReloadAgents}
          activeAgentId={activeAgentId}
          onSelectAgent={onSelectAgent}
          onDeleteFolder={onDeleteFolder}
        />
      </div>
      <CustomerSupportResizeHandle
        panelId="customer-support-inbox-panel"
        panelRef={inboxPanelRef}
        layoutRef={supportLayoutRef}
        siblingPanelRef={conversationPanelRef}
        label="Filas e atendentes"
        isOpen={isInboxSidebarOpen}
        width={inboxSidebarWidth}
        minWidth={180}
        maxWidth={360}
        defaultWidth={CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.inboxWidth}
        onResize={setInboxSidebarWidth}
        onToggle={setIsInboxSidebarOpen}
        onDragChange={setIsDraggingSupportPanel}
      />
    </>
  );
};
