import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { fetchTeamProfiles } from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { AssignedProfileSummary, CustomerSupportFolder } from './types';
import {
  useCustomerSupportConversations,
  useCustomerSupportMessages,
  useCustomerSupportActions,
  useCustomerSupportFolders,
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
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [agents, setAgents] = useState<AssignedProfileSummary[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const roles = profile ? getProfileRoles(profile) : [];
  const canViewCommercialInfo = canPerform('viewCustomerCommercialInfo', roles);
  const {
    folders,
    selectedFolder,
    setSelectedFolder,
    saveFolder,
    removeFolder,
  } = useCustomerSupportFolders(user?.id);

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
    isLoadingMore,
    hasMoreConversations,
    totalCount,
    loadMoreConversations,
  } = useCustomerSupportConversations({
    userId: user?.id,
    agentId: activeAgentId,
    folderCriteria: selectedFolder?.criteria || null,
    canViewCommercialInfo,
  });

  // 2. Gerenciamento de mensagens da conversa selecionada e canal Realtime
  const handleClearUnread = useCallback(
    (convId: string) => {
      setConversations((prev) => {
        const target = prev.find((c) => c.id === convId);
        if (!target || target.unreadCount === 0) return prev;
        return prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c));
      });
    },
    [setConversations]
  );

  const {
    messages,
    setMessages,
    isLoadingMessages,
    isLoadingOlderMessages,
    hasOlderMessages,
    loadOlderMessages,
    isRefreshingMessages,
    refreshMessages,
  } = useCustomerSupportMessages({
    selectedConversation,
    onClearUnread: handleClearUnread,
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

  useEffect(() => {
    let active = true;
    fetchTeamProfiles(supabase).then((profiles) => {
      if (active) setAgents(profiles);
    });
    return () => { active = false; };
  }, []);

  const handleFilterChange = (nextFilter: typeof filter) => {
    setSelectedFolder(null);
    setActiveAgentId(null);
    setFilter(nextFilter);
  };

  const handleSelectAgent = (agentId: string | null) => {
    setSelectedFolder(null);
    setActiveAgentId(agentId);
    setFilter('all');
  };

  const handleSelectFolder = (folder: CustomerSupportFolder) => {
    if (folder.criteria.orders !== 'all' && !canViewCommercialInfo) {
      toast.error('Esta pasta exige a permissão de informações comerciais para consultar pedidos.');
      return;
    }
    setActiveAgentId(null);
    setFilter('all');
    setSelectedFolder(folder);
  };

  const handleDeleteFolder = async (folder: CustomerSupportFolder) => {
    if (!window.confirm(`Excluir a pasta compartilhada "${folder.name}"?`)) return;
    const error = await removeFolder(folder.id);
    if (error) toast.error(error);
    else toast.success(`Pasta "${folder.name}" excluída.`);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-slate-900 select-none">
      {/* Coluna 1: Barra Vertical de Navegação (~56-60px) */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <NavigationRail
          activeFilter={filter}
          onFilterChange={handleFilterChange}
          unreadCountTotal={unreadCountTotal}
          mineCountTotal={mineCountTotal}
          unassignedCountTotal={unassignedCountTotal}
          onOpenPolicy={() => setIsPolicyModalOpen(true)}
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
          onFilterChange={handleFilterChange}
          totalAll={totalAll}
          totalMine={mineCountTotal}
          totalUnassigned={unassignedCountTotal}
          totalUnread={unreadCountTotal}
          isOpen={isInboxSidebarOpen}
          onToggleCollapse={() => setIsInboxSidebarOpen(false)}
          agents={agents}
          activeAgentId={activeAgentId}
          onSelectAgent={handleSelectAgent}
          folders={folders}
          selectedFolder={selectedFolder}
          currentUserId={user?.id}
          onSelectFolder={handleSelectFolder}
          onClearFolder={() => setSelectedFolder(null)}
          onSaveFolder={async (name, criteria, folderId) => {
            const error = await saveFolder({ id: folderId, name, criteria });
            if (!error && !folderId) {
              setActiveAgentId(null);
              setFilter('all');
            }
            return error;
          }}
          onDeleteFolder={handleDeleteFolder}
          canViewCommercialInfo={canViewCommercialInfo}
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
          onFilterChange={handleFilterChange}
          search={search}
          onSearchChange={setSearch}
          onOpenPolicy={() => setIsPolicyModalOpen(true)}
          isLoading={isLoadingConversations}
          onRefresh={loadConversations}
          currentUserId={user?.id}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          hasMore={hasMoreConversations}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          onLoadMore={loadMoreConversations}
          canViewCommercialInfo={canViewCommercialInfo}
        />
      </div>

      {/* Coluna 4: Área Principal do Chat (Flex-1) */}
      {selectedConversation ? (
        <div className="flex-1 flex h-full min-w-0 relative">
          <ChatArea
            conversation={selectedConversation}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            hasOlderMessages={hasOlderMessages}
            isLoadingOlderMessages={isLoadingOlderMessages}
            onLoadOlderMessages={loadOlderMessages}
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
            onRefreshMessages={refreshMessages}
            isRefreshingMessages={isRefreshingMessages}
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

      {/* Aviso de política do módulo */}
      <UsageConsumptionModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
      />
    </div>
  );
}
