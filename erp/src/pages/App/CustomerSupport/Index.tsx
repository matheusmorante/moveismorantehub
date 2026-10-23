import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportFolderDeleteSchema, type SupportFolderDeleteInput } from '../../../../../shared-utils/customerSupportFormSchemas';
import { getTestArtifactContext } from '../../../../../shared-utils/testArtifactContext';
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
  const { user, profile, isAdmin } = useAuth();
  const currentTestIdentity = import.meta.env.DEV && isAdmin ? getTestArtifactContext() : null;
  const folderTestIdentity = currentTestIdentity?.ownerId === user?.id ? currentTestIdentity : null;
  const folderDeleteLock = useRef(false);
  const folderDeleteForm = useForm<SupportFolderDeleteInput>({ resolver: zodResolver(supportFolderDeleteSchema) });
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [agents, setAgents] = useState<AssignedProfileSummary[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentReloadKey, setAgentReloadKey] = useState(0);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const roles = profile ? getProfileRoles(profile) : [];
  const canViewCommercialInfo = canPerform('viewCustomerCommercialInfo', roles);
  const {
    folders,
    selectedFolder,
    setSelectedFolder,
    saveFolder,
    removeFolder,
    isLoadingFolders,
    foldersError,
    loadFolders,
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
    conversationsError,
    hasMoreConversations,
    totalCount,
    loadMoreConversations,
  } = useCustomerSupportConversations({
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
      setSelectedConversation((prev) => prev?.id === convId && prev.unreadCount > 0
        ? { ...prev, unreadCount: 0 } : prev);
    },
    [setConversations, setSelectedConversation]
  );

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
    isRefreshingMessages,
    messagesError,
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
    if (folderDeleteLock.current) return;
    folderDeleteLock.current = true;
    folderDeleteForm.reset({ folderId: folder.id, createdBy: folder.createdBy, currentUserId: user?.id || '' });
    try {
      await folderDeleteForm.handleSubmit(async (data) => {
        if (!window.confirm(`Excluir a pasta compartilhada "${folder.name}"?`)) return;
        const error = await removeFolder(data.folderId);
        if (error) toast.error(error);
        else toast.success(`Pasta "${folder.name}" excluída.`);
      }, () => toast.error('Não foi possível validar a pasta e seu autor para exclusão.'))();
    } catch {
      toast.error('Não foi possível excluir a pasta. Tente novamente.');
    } finally {
      folderDeleteLock.current = false;
    }
  };

  const activityRefreshKey = messages
    .filter((message) => message.messageType === 'internal_note' || message.messageType === 'system_event')
    .map((message) => message.id)
    .join('|');

  return (
    <div className="flex flex-1 min-h-0 h-full w-full overflow-hidden bg-white dark:bg-slate-900 select-none">
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
          isLoadingAgents={isLoadingAgents}
          agentsError={agentsError}
          onReloadAgents={() => setAgentReloadKey((key) => key + 1)}
          activeAgentId={activeAgentId}
          onSelectAgent={handleSelectAgent}
          folders={folders}
          isLoadingFolders={isLoadingFolders}
          foldersError={foldersError}
          onReloadFolders={loadFolders}
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
          testIdentity={folderTestIdentity}
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
          error={conversationsError}
          totalCount={totalCount}
          onLoadMore={loadMoreConversations}
          canViewCommercialInfo={canViewCommercialInfo}
        />
      </div>

      {/* Coluna 4: Área Principal do Chat (Flex-1) */}
      {selectedConversation ? (
        <div className="flex-1 flex h-full min-w-0 relative">
          <ChatArea
            key={selectedConversation.id}
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
            onResolveReplyTarget={resolveReplyTarget}
            onJumpToMessage={jumpToMessage}
            jumpToMessageId={jumpToMessageId}
            onJumpComplete={clearJumpToMessage}
          />

          {/* Coluna 5: Painel Contextual do ERP (Dados do Cliente e Pedidos) */}
          <CustomerInfoPanel
            key={selectedConversation.id}
            conversation={selectedConversation}
            isOpen={isInfoPanelOpen}
            onClose={() => setIsInfoPanelOpen(false)}
            onConversationUpdated={handleConversationUpdated}
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
