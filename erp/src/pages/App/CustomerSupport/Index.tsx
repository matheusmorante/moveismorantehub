import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { fetchTeamProfiles, sendCustomerSupportMessage } from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { AssignedProfileSummary, WhatsAppConversation } from './types';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
import {
  useCustomerSupportConversations,
  useCustomerSupportMessages,
  useCustomerSupportActions,
  useCustomerSupportPanelLayout,
} from './hooks';
import {
  NavigationRail,
  InboxSidebar,
  ConversationSidebar,
  ChatArea,
  CustomerInfoPanel,
  ActivityTimelineDrawer,
  EmptyChatState,
} from './components';
import { CustomerSupportResizeHandle } from './components/CustomerSupportResizeHandle';
import { CUSTOMER_SUPPORT_LAYOUT_DEFAULTS } from './customerSupportLayoutPreferences';

export default function CustomerSupport() {
  const { user, profile } = useAuth();
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [shareOrderRequest, setShareOrderRequest] = useState<{ conversationId: string; requestId: string; record: SupportOrderSummary } | null>(null);
  const [agents, setAgents] = useState<AssignedProfileSummary[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentReloadKey, setAgentReloadKey] = useState(0);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const roles = profile ? getProfileRoles(profile) : [];
  const canViewCommercialInfo = canPerform('viewCustomerCommercialInfo', roles);
  const {
    supportLayoutRef,
    inboxPanelRef,
    conversationPanelRef,
    isInboxSidebarOpen,
    setIsInboxSidebarOpen,
    inboxSidebarWidth,
    setInboxSidebarWidth,
    isConversationSidebarOpen,
    setIsConversationSidebarOpen,
    conversationSidebarWidth,
    setConversationSidebarWidth,
    isMobileInboxOpen,
    setIsMobileInboxOpen,
    isMobileViewport,
    isDraggingSupportPanel,
    setIsDraggingSupportPanel,
    inboxPanelVisible,
    inboxPanelStyle,
    conversationPanelStyle,
    handleToggleInboxPanel,
    handleCloseInboxPanel,
  } = useCustomerSupportPanelLayout(user?.id);

  // 1. Gerenciamento de conversas, filtros, busca e sincronização Realtime
  const {
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    filter,
    setFilter,
    sortOrder,
    isLoadingConversations,
    loadConversations,
    totalAll,
    unreadCountTotal,
    mineCountTotal,
    unassignedCountTotal,
    isLoadingMore,
    conversationsError,
    hasMoreConversations,
    totalCount,
    loadMoreConversations,
  } = useCustomerSupportConversations({
    agentId: activeAgentId,
    canViewCommercialInfo,
  });

  // 2. Gerenciamento de mensagens da conversa selecionada e canal Realtime
  const {
    messages,
    setMessages,
    resolveReplyTarget,
    jumpToMessage,
    jumpToMessageId,
    clearJumpToMessage,
    isLoadingMessages,
    isLoadingOlderMessages,
    hasOlderMessages,
    loadOlderMessages,
    messagesError,
    refreshMessages,
  } = useCustomerSupportMessages({
    selectedConversation,
  });

  // 3. Operações e ações de atendimento (status, atribuição, notas internas)
  const currentUserName = profile?.full_name || user?.email || 'Atendente';
  const {
    handleToggleArchive,
    handleToggleReadStatus,
    handleConversationUpdated,
    handleAssignConversation,
    handleUpdateStatus,
    handleAddInternalNote,
  } = useCustomerSupportActions({
    selectedConversation,
    setSelectedConversation,
    setConversations,
    setMessages,
    currentUserName,
    currentUserId: user?.id,
    currentUserRole: profile?.role,
  });

  useEffect(() => {
    let active = true;
    setAgents([]);
    setAgentsError(null);
    setIsLoadingAgents(Boolean(user?.id));
    if (user?.id) {
      fetchTeamProfiles(supabase).then((profiles) => {
        if (active) setAgents(profiles);
      }).catch(() => {
        if (active) setAgentsError('Não foi possível carregar os atendentes. Tente novamente.');
      }).finally(() => {
        if (active) setIsLoadingAgents(false);
      });
    }
    return () => { active = false; };
  }, [user?.id, agentReloadKey]);

  const handleFilterChange = (nextFilter: typeof filter) => {
    setActiveAgentId(null);
    setFilter(nextFilter);
  };

  const handleSelectAgent = (agentId: string | null) => {
    setActiveAgentId(agentId);
    setFilter('all');
  };

  const handleToggleConversationPanel = () => {
    if (isMobileViewport) {
      setIsMobileInboxOpen(false);
      setSelectedConversation(null);
    } else setIsConversationSidebarOpen((open) => !open);
  };

  const handleSelectConversation = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    if (isMobileViewport) setIsMobileInboxOpen(false);
  };

  const activityRefreshKey = messages
    .filter((message) => message.messageType === 'internal_note' || message.messageType === 'system_event')
    .map((message) => message.id)
    .join('|');

  return (
    <div ref={supportLayoutRef} data-testid="customer-support-layout" className="relative flex flex-1 min-h-0 h-full w-full overflow-hidden bg-white dark:bg-slate-900 select-none">
      {/* Coluna 1: Barra Vertical de Navegação (~56-60px) */}
      <div className="flex h-full shrink-0 relative z-20">
        <NavigationRail
          unreadCountTotal={unreadCountTotal}
          isInboxSidebarOpen={inboxPanelVisible}
          onToggleInboxSidebar={handleToggleInboxPanel}
          isConversationSidebarOpen={isMobileViewport ? !selectedConversation : isConversationSidebarOpen}
          onToggleConversationSidebar={handleToggleConversationPanel}
        />
      </div>

      {isMobileViewport && isMobileInboxOpen && (
        <button
          type="button"
          aria-label="Fechar filas e atendentes"
          onClick={() => setIsMobileInboxOpen(false)}
          className="absolute inset-y-0 left-[56px] right-0 z-30 bg-slate-950/30 md:hidden"
        />
      )}

      <div
        ref={inboxPanelRef}
        id="customer-support-inbox-panel"
        data-testid="customer-support-inbox-panel"
        aria-hidden={!inboxPanelVisible}
        className="h-full shrink-0 overflow-hidden"
        style={inboxPanelStyle}
      >
        <InboxSidebar
          activeFilter={filter}
          onFilterChange={handleFilterChange}
          totalAll={totalAll}
          totalMine={mineCountTotal}
          totalUnassigned={unassignedCountTotal}
          totalUnread={unreadCountTotal}
          onToggleCollapse={handleCloseInboxPanel}
          agents={agents}
          isLoadingAgents={isLoadingAgents}
          agentsError={agentsError}
          onReloadAgents={() => setAgentReloadKey((key) => key + 1)}
          activeAgentId={activeAgentId}
          onSelectAgent={handleSelectAgent}
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

      {/* A lista continua montada quando recolhida ou quando o chat ocupa a tela móvel. */}
      <div
        ref={conversationPanelRef}
        id="customer-support-conversations-panel"
        data-testid="customer-support-conversations-panel"
        aria-hidden={isMobileViewport ? Boolean(selectedConversation) : !isConversationSidebarOpen}
        className={`relative h-full shrink-0 overflow-hidden ${isMobileViewport && Boolean(selectedConversation) ? 'hidden' : 'flex'}`}
        style={conversationPanelStyle}
      >
        <ConversationSidebar
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          onJumpToMessage={jumpToMessage}
          filter={filter}
          onFilterChange={handleFilterChange}
          isLoading={isLoadingConversations}
          onRefresh={loadConversations}
          currentUserId={user?.id}
          sortOrder={sortOrder}
          hasMore={hasMoreConversations}
          isLoadingMore={isLoadingMore}
          error={conversationsError}
          totalCount={totalCount}
          onLoadMore={loadMoreConversations}
          canViewCommercialInfo={canViewCommercialInfo}
          isConversationSidebarOpen={isConversationSidebarOpen}
          onToggleConversationSidebar={handleToggleConversationPanel}
          isMobileViewport={isMobileViewport}
        />
      </div>
      <CustomerSupportResizeHandle
        panelId="customer-support-conversations-panel"
        panelRef={conversationPanelRef}
        layoutRef={supportLayoutRef}
        siblingPanelRef={inboxPanelRef}
        label="Lista de conversas"
        isOpen={isConversationSidebarOpen}
        width={conversationSidebarWidth}
        minWidth={260}
        maxWidth={600}
        defaultWidth={CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.conversationsWidth}
        onResize={setConversationSidebarWidth}
        onToggle={setIsConversationSidebarOpen}
        onDragChange={setIsDraggingSupportPanel}
      />

      {/* Coluna 4: Área Principal do Chat (Flex-1) */}
      {selectedConversation ? (
        <div className="flex-1 flex h-full min-h-0 min-w-0 md:min-w-[240px] relative">
          <ChatArea
            key={`chat-${selectedConversation.id}`}
            conversation={selectedConversation}
            teamMembers={agents}
            isLoadingAgents={isLoadingAgents}
            agentsError={agentsError}
            onReloadAgents={() => setAgentReloadKey((key) => key + 1)}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            messagesError={messagesError}
            hasOlderMessages={hasOlderMessages}
            isLoadingOlderMessages={isLoadingOlderMessages}
            onLoadOlderMessages={loadOlderMessages}
            onBackMobile={() => setSelectedConversation(null)}
            onToggleInfoPanel={() => {
              setIsInfoPanelOpen((prev) => !prev);
              if (!isInfoPanelOpen) setIsTimelineOpen(false);
            }}
            isTimelineOpen={isTimelineOpen}
            onToggleTimeline={() => {
              setIsTimelineOpen((prev) => !prev);
              if (!isTimelineOpen) setIsInfoPanelOpen(false);
            }}
            onToggleArchive={handleToggleArchive}
            onToggleReadStatus={handleToggleReadStatus}
            onAssign={handleAssignConversation}
            onUpdateStatus={handleUpdateStatus}
            onAddInternalNote={handleAddInternalNote}
            onSendCustomerMessage={(input) => sendCustomerSupportMessage(supabase, selectedConversation.id, input)}
            onRefreshMessages={refreshMessages}
            onResolveReplyTarget={resolveReplyTarget}
            onSelectConversation={handleSelectConversation}
            onJumpToMessage={jumpToMessage}
            jumpToMessageId={jumpToMessageId}
            onJumpComplete={clearJumpToMessage}
            shareOrderRequest={shareOrderRequest}
            onShareOrderRequestHandled={(requestId) => setShareOrderRequest((current) => current?.requestId === requestId ? null : current)}
          />

          {/* Coluna 5: Painel Contextual do ERP (Dados do Cliente e Pedidos) */}
          <CustomerInfoPanel
            key={`customer-info-${selectedConversation.id}`}
            conversation={selectedConversation}
            isOpen={isInfoPanelOpen}
            onClose={() => setIsInfoPanelOpen(false)}
            onConversationUpdated={handleConversationUpdated}
            onShareBudget={(record) => selectedConversation && setShareOrderRequest({
              conversationId: selectedConversation.id,
              requestId: `${Date.now()}-${Math.random()}`,
              record,
            })}
            onJumpToMessage={(message) => {
              jumpToMessage(message);
              setIsInfoPanelOpen(false);
            }}
          />

          {/* Linha do Tempo / Histórico de Atividades (Ativado via botão 🕒 do cabeçalho) */}
          <ActivityTimelineDrawer
            conversationId={selectedConversation.id}
            activityRefreshKey={activityRefreshKey}
            isOpen={isTimelineOpen}
            onClose={() => setIsTimelineOpen(false)}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 h-full min-w-0 md:min-w-[240px]">
          <EmptyChatState enableDevelopmentTestMode={import.meta.env.DEV} />
        </div>
      )}

    </div>
  );
}
