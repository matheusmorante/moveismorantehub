import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getMonthlyUsage, FreeTierUsageInfo } from '@/pages/utils/customerSupport/freeTierTracker';
import { useAuth } from '@/context/AuthContext';
import {
  useCustomerSupportConversations,
  useCustomerSupportMessages,
  useCustomerSupportActions,
} from './hooks';
import {
  NavigationRail,
  InboxSidebar,
  ConversationSidebar,
  ChatArea,
  CustomerInfoPanel,
  ActivityTimelineDrawer,
  EmptyChatState,
  UsageConsumptionModal,
} from './components';

export default function CustomerSupport() {
  const { user, profile } = useAuth();
  const [usageInfo, setUsageInfo] = useState<FreeTierUsageInfo | null>(null);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);

  // 1. Gerenciamento de conversas, filtros, busca e sincronização Realtime
  const {
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    filter,
    setFilter,
    sortOrder,
    setSortOrder,
    search,
    setSearch,
    isLoadingConversations,
    isRealtimeConnected,
    loadConversations,
    totalAll,
    unreadCountTotal,
    mineCountTotal,
    unassignedCountTotal,
  } = useCustomerSupportConversations({ userId: user?.id });

  // 2. Gerenciamento de mensagens da conversa selecionada e canal Realtime
  const { messages, setMessages, isLoadingMessages } = useCustomerSupportMessages({
    selectedConversation,
    onClearUnread: (convId) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    },
  });

  // 3. Operações e ações de atendimento (status, atribuição, notas internas)
  const currentUserName = profile?.full_name || user?.email || 'Atendente';
  const {
    handleToggleArchive,
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

  // 4. Franquia gratuita da Meta Cloud API
  const loadUsage = useCallback(async () => {
    const info = await getMonthlyUsage(supabase);
    setUsageInfo(info);
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-slate-900 select-none">
      {/* Coluna 1: Barra Vertical de Navegação (~56-60px) */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <NavigationRail
          activeFilter={filter}
          onFilterChange={setFilter}
          unreadCountTotal={unreadCountTotal}
          mineCountTotal={mineCountTotal}
          unassignedCountTotal={unassignedCountTotal}
          usageInfo={usageInfo}
          onOpenUsageModal={() => setIsUsageModalOpen(true)}
          isLoading={isLoadingConversations}
          onRefresh={loadConversations}
          isRealtimeConnected={isRealtimeConnected}
          isInboxSidebarOpen={isInboxSidebarOpen}
          onToggleInboxSidebar={() => setIsInboxSidebarOpen((prev) => !prev)}
        />
      </div>

      {/* Coluna 2: Barra de Pastas e Filas "Inbox" (~230px) — Recolhível */}
      <div
        className={`${
          selectedConversation
            ? isInboxSidebarOpen
              ? 'hidden xl:flex'
              : 'hidden'
            : isInboxSidebarOpen
              ? 'hidden sm:flex'
              : 'hidden'
        }`}
      >
        <InboxSidebar
          activeFilter={filter}
          onFilterChange={setFilter}
          totalAll={totalAll}
          totalMine={mineCountTotal}
          totalUnassigned={unassignedCountTotal}
          totalUnread={unreadCountTotal}
          isOpen={isInboxSidebarOpen}
          onToggleCollapse={() => setIsInboxSidebarOpen(false)}
        />
      </div>

      {/* Coluna 3: Lista de Conversas (~350px) — No mobile, esconde se houver conversa aberta */}
      <div
        className={`h-full ${
          selectedConversation ? 'hidden md:flex' : 'flex w-full md:w-auto'
        }`}
      >
        <ConversationSidebar
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          usageInfo={usageInfo}
          onOpenUsageModal={() => setIsUsageModalOpen(true)}
          isLoading={isLoadingConversations}
          onRefresh={loadConversations}
          currentUserId={user?.id}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
        />
      </div>

      {/* Coluna 4: Área Principal do Chat (Flex-1) */}
      {selectedConversation ? (
        <div className="flex-1 flex h-full min-w-0 relative">
          <ChatArea
            conversation={selectedConversation}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            onBackMobile={() => setSelectedConversation(null)}
            isInfoPanelOpen={isInfoPanelOpen}
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
            onAssign={handleAssignConversation}
            onUpdateStatus={handleUpdateStatus}
            onAddInternalNote={handleAddInternalNote}
          />

          {/* Coluna 5: Painel Contextual do ERP (Dados do Cliente e Pedidos) */}
          <CustomerInfoPanel
            conversation={selectedConversation}
            messages={messages}
            isOpen={isInfoPanelOpen}
            onClose={() => setIsInfoPanelOpen(false)}
            onConversationUpdated={handleConversationUpdated}
          />

          {/* Linha do Tempo / Histórico de Atividades (Ativado via botão 🕒 do cabeçalho) */}
          <ActivityTimelineDrawer
            conversation={selectedConversation}
            messages={messages}
            isOpen={isTimelineOpen}
            onClose={() => setIsTimelineOpen(false)}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 h-full">
          <EmptyChatState />
        </div>
      )}

      {/* Modal de Consumo da Franquia Meta */}
      <UsageConsumptionModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        usageInfo={usageInfo}
      />
    </div>
  );
}
