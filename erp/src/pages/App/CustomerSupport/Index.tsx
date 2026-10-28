import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportFolderDeleteSchema, type SupportFolderDeleteInput } from '../../../../../shared-utils/customerSupportFormSchemas';
import { getTestArtifactContext } from '../../../../../shared-utils/testArtifactContext';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { fetchTeamProfiles, sendCustomerSupportMessage } from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { AssignedProfileSummary, CustomerSupportFolder, WhatsAppConversation } from './types';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
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
import { CustomerSupportResizeHandle } from './components/CustomerSupportResizeHandle';
import {
  CUSTOMER_SUPPORT_LAYOUT_DEFAULTS,
  loadCustomerSupportLayoutPreferences,
  saveCustomerSupportLayoutPreferences,
} from './customerSupportLayoutPreferences';

export default function CustomerSupport() {
  const { user, profile, isAdmin } = useAuth();
  const currentTestIdentity = import.meta.env.DEV && isAdmin ? getTestArtifactContext() : null;
  const folderTestIdentity = currentTestIdentity?.ownerId === user?.id ? currentTestIdentity : null;
  const folderDeleteLock = useRef(false);
  const folderDeleteForm = useForm<SupportFolderDeleteInput>({ resolver: zodResolver(supportFolderDeleteSchema) });
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(true);
  const [inboxSidebarWidth, setInboxSidebarWidth] = useState(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.inboxWidth);
  const [isConversationSidebarOpen, setIsConversationSidebarOpen] = useState(true);
  const [conversationSidebarWidth, setConversationSidebarWidth] = useState(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.conversationsWidth);
  const [isMobileInboxOpen, setIsMobileInboxOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [isDraggingSupportPanel, setIsDraggingSupportPanel] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [shareOrderRequest, setShareOrderRequest] = useState<{ conversationId: string; requestId: string; record: SupportOrderSummary } | null>(null);
  const [agents, setAgents] = useState<AssignedProfileSummary[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentReloadKey, setAgentReloadKey] = useState(0);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const supportLayoutRef = useRef<HTMLDivElement>(null);
  const inboxPanelRef = useRef<HTMLDivElement>(null);
  const conversationPanelRef = useRef<HTMLDivElement>(null);
  const preferencesLoadedForUser = useRef<string | null>(null);
  const skipLayoutPreferenceSave = useRef(false);
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

  useEffect(() => {
    const preferences = loadCustomerSupportLayoutPreferences(user?.id);
    preferencesLoadedForUser.current = user?.id || null;
    skipLayoutPreferenceSave.current = true;
    setInboxSidebarWidth(preferences.inboxWidth);
    setConversationSidebarWidth(preferences.conversationsWidth);
    setIsInboxSidebarOpen(preferences.isInboxOpen);
    setIsConversationSidebarOpen(preferences.isConversationsOpen);
  }, [user?.id]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => {
      setIsMobileViewport(media.matches);
    };
    updateViewport();
    media.addEventListener('change', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      media.removeEventListener('change', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport) setIsMobileInboxOpen(false);
  }, [isMobileViewport]);

  useEffect(() => {
    if (skipLayoutPreferenceSave.current) {
      skipLayoutPreferenceSave.current = false;
      return;
    }
    if (!user?.id || preferencesLoadedForUser.current !== user.id || isMobileViewport || isDraggingSupportPanel) return;
    saveCustomerSupportLayoutPreferences(user.id, {
      inboxWidth: inboxSidebarWidth,
      conversationsWidth: conversationSidebarWidth,
      isInboxOpen: isInboxSidebarOpen,
      isConversationsOpen: isConversationSidebarOpen,
    });
  }, [
    user?.id,
    isMobileViewport,
    isDraggingSupportPanel,
    inboxSidebarWidth,
    conversationSidebarWidth,
    isInboxSidebarOpen,
    isConversationSidebarOpen,
  ]);

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
    isLoadingConversations,
    realtimeStatus,
    reconnectRealtime,
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

  const handleToggleInboxPanel = () => {
    if (isMobileViewport) setIsMobileInboxOpen((open) => !open);
    else setIsInboxSidebarOpen((open) => !open);
  };

  const handleCloseInboxPanel = () => {
    if (isMobileViewport) setIsMobileInboxOpen(false);
    else setIsInboxSidebarOpen(false);
  };

  const handleToggleConversationPanel = () => {
    if (isMobileViewport) {
      setIsMobileInboxOpen(false);
      setSelectedConversation(null);
    } else setIsConversationSidebarOpen((open) => !open);
  };

  const handleResetLayout = () => {
    setInboxSidebarWidth(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.inboxWidth);
    setConversationSidebarWidth(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.conversationsWidth);
    setIsInboxSidebarOpen(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.isInboxOpen);
    setIsConversationSidebarOpen(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.isConversationsOpen);
  };

  const handleSelectConversation = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    if (isMobileViewport) setIsMobileInboxOpen(false);
  };

  const inboxPanelVisible = isMobileViewport ? isMobileInboxOpen : isInboxSidebarOpen;
  const inboxPanelStyle = isMobileViewport
    ? {
        position: 'absolute' as const,
        left: '56px',
        top: 0,
        bottom: 0,
        width: isMobileInboxOpen ? 'min(280px, calc(100vw - 56px))' : '0px',
        flex: '0 0 0px',
        zIndex: 40,
        boxShadow: isMobileInboxOpen ? '0 12px 32px rgba(15, 23, 42, 0.24)' : 'none',
        visibility: isMobileInboxOpen ? 'visible' as const : 'hidden' as const,
        pointerEvents: isMobileInboxOpen ? 'auto' as const : 'none' as const,
        transition: isDraggingSupportPanel ? 'none' : 'width 180ms ease',
      }
    : {
        position: 'relative' as const,
        width: isInboxSidebarOpen ? `${inboxSidebarWidth}px` : '0px',
        flex: isInboxSidebarOpen ? `0 1 ${inboxSidebarWidth}px` : '0 0 0px',
        minWidth: isInboxSidebarOpen ? '180px' : '0px',
        maxWidth: '360px',
        zIndex: 10,
        visibility: isInboxSidebarOpen ? 'visible' as const : 'hidden' as const,
        pointerEvents: isInboxSidebarOpen ? 'auto' as const : 'none' as const,
        transition: isDraggingSupportPanel ? 'none' : 'width 180ms ease, flex-basis 180ms ease',
      };

  const conversationPanelStyle = isMobileViewport
    ? {
        position: 'relative' as const,
        width: 'auto',
        flex: '1 1 0%',
        minWidth: 0,
        maxWidth: 'none',
        transition: 'none',
      }
    : {
        position: 'relative' as const,
        width: isConversationSidebarOpen ? `${conversationSidebarWidth}px` : '0px',
        flex: isConversationSidebarOpen ? `0 1 ${conversationSidebarWidth}px` : '0 0 0px',
        minWidth: isConversationSidebarOpen ? '260px' : '0px',
        maxWidth: '600px',
        visibility: isConversationSidebarOpen ? 'visible' as const : 'hidden' as const,
        pointerEvents: isConversationSidebarOpen ? 'auto' as const : 'none' as const,
        transition: isDraggingSupportPanel ? 'none' : 'width 180ms ease, flex-basis 180ms ease',
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
    <div ref={supportLayoutRef} data-testid="customer-support-layout" className="relative flex flex-1 min-h-0 h-full w-full overflow-hidden bg-white dark:bg-slate-900 select-none">
      {/* Coluna 1: Barra Vertical de Navegação (~56-60px) */}
      <div className="flex h-full shrink-0 relative z-20">
        <NavigationRail
          unreadCountTotal={unreadCountTotal}
          onOpenPolicy={() => setIsPolicyModalOpen(true)}
          realtimeStatus={realtimeStatus}
          onReconnectRealtime={reconnectRealtime}
          isInboxSidebarOpen={inboxPanelVisible}
          onToggleInboxSidebar={handleToggleInboxPanel}
          isConversationSidebarOpen={isMobileViewport ? !selectedConversation : isConversationSidebarOpen}
          onToggleConversationSidebar={handleToggleConversationPanel}
          isMobileViewport={isMobileViewport}
          onResetLayout={handleResetLayout}
        />
      </div>

      {isMobileViewport && isMobileInboxOpen && (
        <button
          type="button"
          aria-label="Fechar pastas e filas"
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
      <CustomerSupportResizeHandle
        panelId="customer-support-inbox-panel"
        panelRef={inboxPanelRef}
        layoutRef={supportLayoutRef}
        siblingPanelRef={conversationPanelRef}
        label="Pastas e filas"
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
          onSortChange={setSortOrder}
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

      {/* Aviso de política do módulo */}
      <UsageConsumptionModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        enableDevelopmentTestMode={import.meta.env.DEV}
      />
    </div>
  );
}
