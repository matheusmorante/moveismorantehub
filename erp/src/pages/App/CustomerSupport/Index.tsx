import React from 'react';
import { useCustomerSupportPageController } from './hooks/useCustomerSupportPageController';
import {
  NavigationRail,
  EmptyChatState,
  InboxSidebar,
} from './components';
import { WhatsAppAiAgentModal } from './components/WhatsAppAiAgentModal';
import {
  InboxSidebarColumn,
  ConversationSidebarColumn,
  CustomerSupportActiveConversation,
} from './components/layout';

export default function CustomerSupport() {
  const {
    user,
    canViewCommercialInfo,
    isInfoPanelOpen,
    setIsInfoPanelOpen,
    isTimelineOpen,
    setIsTimelineOpen,
    isAiAgentModalOpen,
    setIsAiAgentModalOpen,
    shareOrderRequest,
    agents,
    isLoadingAgents,
    agentsError,
    activeAgentId,
    reloadAgents,
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
    setIsDraggingSupportPanel,
    inboxPanelVisible,
    inboxPanelStyle,
    conversationPanelStyle,
    handleToggleInboxPanel,
    handleCloseInboxPanel,
    conversations,
    selectedConversation,
    setSelectedConversation,
    filter,
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
    messages,
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
    handleToggleArchive,
    handleToggleReadStatus,
    handleConversationUpdated,
    handleAssignConversation,
    handleUpdateStatus,
    handleUpdateAiStatus,
    handleAddInternalNote,
    handleFilterChange,
    handleSelectAgent,
    handleToggleConversationPanel,
    handleSelectConversation,
    handleToggleInfoPanel,
    handleToggleTimeline,
    handleSendCustomerMessage,
    handleShareBudget,
    handleShareOrderRequestHandled,
    handleJumpToMessageFromPanel,
    activityRefreshKey,
    handleDeleteFolder,
  } = useCustomerSupportPageController();

  return (
    <div
      ref={supportLayoutRef}
      data-testid="customer-support-layout"
      className="relative flex flex-1 min-h-0 h-full w-full overflow-hidden bg-white dark:bg-slate-900 select-none"
    >
      {/* Coluna 1: Barra Vertical de Navegação (~56-60px) */}
      <div className="flex h-full shrink-0 relative z-20">
        <NavigationRail
          unreadCountTotal={unreadCountTotal}
          isInboxSidebarOpen={inboxPanelVisible}
          onToggleInboxSidebar={handleToggleInboxPanel}
          isConversationSidebarOpen={isMobileViewport ? !selectedConversation : isConversationSidebarOpen}
          onToggleConversationSidebar={handleToggleConversationPanel}
          onOpenAiAgentModal={() => setIsAiAgentModalOpen(true)}
          isAiAgentModalOpen={isAiAgentModalOpen}
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

      {/* Coluna 2: Filas e Atendentes */}
      <InboxSidebarColumn
        InboxSidebarComponent={InboxSidebar}
        onDeleteFolder={handleDeleteFolder}
        inboxPanelRef={inboxPanelRef}
        supportLayoutRef={supportLayoutRef}
        conversationPanelRef={conversationPanelRef}
        inboxPanelVisible={inboxPanelVisible}
        inboxPanelStyle={inboxPanelStyle}
        isInboxSidebarOpen={isInboxSidebarOpen}
        inboxSidebarWidth={inboxSidebarWidth}
        filter={filter}
        totalAll={totalAll}
        mineCountTotal={mineCountTotal}
        unassignedCountTotal={unassignedCountTotal}
        unreadCountTotal={unreadCountTotal}
        agents={agents}
        isLoadingAgents={isLoadingAgents}
        agentsError={agentsError}
        activeAgentId={activeAgentId}
        onFilterChange={handleFilterChange}
        onCloseInboxPanel={handleCloseInboxPanel}
        onReloadAgents={reloadAgents}
        onSelectAgent={handleSelectAgent}
        setInboxSidebarWidth={setInboxSidebarWidth}
        setIsInboxSidebarOpen={setIsInboxSidebarOpen}
        setIsDraggingSupportPanel={setIsDraggingSupportPanel}
      />

      {/* Coluna 3: Lista de Conversas */}
      <ConversationSidebarColumn
        conversationPanelRef={conversationPanelRef}
        supportLayoutRef={supportLayoutRef}
        inboxPanelRef={inboxPanelRef}
        isMobileViewport={isMobileViewport}
        selectedConversation={selectedConversation}
        isConversationSidebarOpen={isConversationSidebarOpen}
        conversationPanelStyle={conversationPanelStyle}
        conversations={conversations}
        filter={filter}
        isLoadingConversations={isLoadingConversations}
        conversationsError={conversationsError}
        totalCount={totalCount}
        hasMoreConversations={hasMoreConversations}
        isLoadingMore={isLoadingMore}
        sortOrder={sortOrder}
        currentUserId={user?.id}
        canViewCommercialInfo={canViewCommercialInfo}
        conversationSidebarWidth={conversationSidebarWidth}
        onSelectConversation={handleSelectConversation}
        onJumpToMessage={jumpToMessage}
        onFilterChange={handleFilterChange}
        onRefresh={loadConversations}
        onLoadMore={loadMoreConversations}
        onToggleConversationSidebar={handleToggleConversationPanel}
        setConversationSidebarWidth={setConversationSidebarWidth}
        setIsConversationSidebarOpen={setIsConversationSidebarOpen}
        setIsDraggingSupportPanel={setIsDraggingSupportPanel}
      />

      {/* Coluna 4: Área Principal do Chat (Flex-1) */}
      {selectedConversation ? (
        <CustomerSupportActiveConversation
          selectedConversation={selectedConversation}
          agents={agents}
          isLoadingAgents={isLoadingAgents}
          agentsError={agentsError}
          reloadAgents={reloadAgents}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          messagesError={messagesError}
          hasOlderMessages={hasOlderMessages}
          isLoadingOlderMessages={isLoadingOlderMessages}
          loadOlderMessages={loadOlderMessages}
          onBackMobile={() => setSelectedConversation(null)}
          isInfoPanelOpen={isInfoPanelOpen}
          onToggleInfoPanel={handleToggleInfoPanel}
          onCloseInfoPanel={() => setIsInfoPanelOpen(false)}
          isTimelineOpen={isTimelineOpen}
          onToggleTimeline={handleToggleTimeline}
          onCloseTimeline={() => setIsTimelineOpen(false)}
          onToggleArchive={handleToggleArchive}
          onToggleReadStatus={handleToggleReadStatus}
          onAssign={handleAssignConversation}
          onUpdateStatus={handleUpdateStatus}
          onUpdateAiStatus={handleUpdateAiStatus}
          onAddInternalNote={handleAddInternalNote}
          onSendCustomerMessage={handleSendCustomerMessage}
          onRefreshMessages={refreshMessages}
          resolveReplyTarget={resolveReplyTarget}
          onSelectConversation={handleSelectConversation}
          jumpToMessage={jumpToMessage}
          jumpToMessageId={jumpToMessageId}
          clearJumpToMessage={clearJumpToMessage}
          shareOrderRequest={shareOrderRequest}
          onShareOrderRequestHandled={handleShareOrderRequestHandled}
          onConversationUpdated={handleConversationUpdated}
          onShareBudget={handleShareBudget}
          onJumpToMessageFromPanel={handleJumpToMessageFromPanel}
          activityRefreshKey={activityRefreshKey}
        />
      ) : (
        <div className="hidden md:flex flex-1 h-full min-w-0 md:min-w-[240px]">
          <EmptyChatState enableDevelopmentTestMode={import.meta.env.DEV} />
        </div>
      )}

      {/* Modal de Configurações do Agente de IA do WhatsApp */}
      {isAiAgentModalOpen && (
        <WhatsAppAiAgentModal
          isOpen={isAiAgentModalOpen}
          onClose={() => setIsAiAgentModalOpen(false)}
        />
      )}
    </div>
  );
}
