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
import { AssignedProfileSummary, CustomerSupportFolder, WhatsAppConversation } from './types';
import {
  useCustomerSupportConversations,
  useCustomerSupportMessages,
  useCustomerSupportActions,
  useCustomerSupportFolders,
} from './hooks';
import { CustomerSupportChatPane } from './components/CustomerSupportChatPane';
import {
  CUSTOMER_SUPPORT_MAX_OPEN_CHATS,
  getCustomerSupportMultiChatPresentation,
} from './customerSupportMultiChatLayout';
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
  const [isMobileConversationsOpen, setIsMobileConversationsOpen] = useState(false);
  const [isMultiChatMode, setIsMultiChatMode] = useState(false);
  const [openChatConversations, setOpenChatConversations] = useState<WhatsAppConversation[]>([]);
  const [activeMultiChatId, setActiveMultiChatId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [isDraggingSupportPanel, setIsDraggingSupportPanel] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
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
      setViewportWidth(window.innerWidth);
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
    selectedConversation: isMultiChatMode ? null : selectedConversation,
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
    selectedConversation: isMultiChatMode ? null : selectedConversation,
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
    if (isMultiChatMode) return;
    if (isMobileViewport) setIsMobileInboxOpen((open) => !open);
    else setIsInboxSidebarOpen((open) => !open);
  };

  const handleCloseInboxPanel = () => {
    if (isMobileViewport) setIsMobileInboxOpen(false);
    else setIsInboxSidebarOpen(false);
  };

  const handleToggleConversationPanel = () => {
    if (isMobileViewport) {
      if (isMultiChatMode) {
        setIsMobileInboxOpen(false);
        setIsMobileConversationsOpen((open) => !open);
      } else {
        setIsMobileInboxOpen(false);
        setSelectedConversation(null);
      }
    } else setIsConversationSidebarOpen((open) => !open);
  };

  const handleResetLayout = () => {
    setInboxSidebarWidth(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.inboxWidth);
    setConversationSidebarWidth(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.conversationsWidth);
    setIsInboxSidebarOpen(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.isInboxOpen);
    setIsConversationSidebarOpen(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.isConversationsOpen);
  };

  const handleEnterMultiChatMode = () => {
    if (!selectedConversation) return;
    setOpenChatConversations([selectedConversation]);
    setActiveMultiChatId(selectedConversation.id);
    setIsMultiChatMode(true);
    setIsMobileConversationsOpen(false);
  };

  const handleExitMultiChatMode = () => {
    const remaining = openChatConversations.find((conversation) => conversation.id === activeMultiChatId)
      || selectedConversation
      || openChatConversations[0]
      || null;
    setIsMultiChatMode(false);
    setOpenChatConversations([]);
    setActiveMultiChatId(null);
    setIsMobileConversationsOpen(false);
    setSelectedConversation(remaining);
  };

  const handleActivateMultiChat = (conversation: WhatsAppConversation) => {
    const alreadyOpen = openChatConversations.some((openChat) => openChat.id === conversation.id);
    if (!alreadyOpen && openChatConversations.length >= CUSTOMER_SUPPORT_MAX_OPEN_CHATS) {
      toast.info('Você pode manter até 3 chats abertos ao mesmo tempo.');
      return;
    }
    setOpenChatConversations((previous) => alreadyOpen
      ? previous.map((openChat) => openChat.id === conversation.id ? conversation : openChat)
      : [...previous, conversation]);
    setActiveMultiChatId(conversation.id);
    setSelectedConversation(conversation);
    setIsMobileConversationsOpen(false);
  };

  const handleMultiChatConversationChanged = (conversation: WhatsAppConversation) => {
    setOpenChatConversations((previous) => previous.map((openChat) =>
      openChat.id === conversation.id ? conversation : openChat
    ));
    setConversations((previous) => previous.map((existing) =>
      existing.id === conversation.id ? conversation : existing
    ));
    setSelectedConversation((previous) => previous?.id === conversation.id ? conversation : previous);
  };

  const handleCloseMultiChat = (conversationId: string) => {
    const remaining = openChatConversations.filter((conversation) => conversation.id !== conversationId);
    if (remaining.length <= 1) {
      const selected = remaining[0] || null;
      setIsMultiChatMode(false);
      setOpenChatConversations([]);
      setActiveMultiChatId(null);
      setSelectedConversation(selected);
    } else {
      setOpenChatConversations(remaining);
      if (activeMultiChatId === conversationId) {
        setActiveMultiChatId(remaining[0].id);
        setSelectedConversation(remaining[0]);
      }
    }
  };

  const handleSelectConversation = (conversation: WhatsAppConversation) => {
    if (isMultiChatMode) {
      handleActivateMultiChat(conversation);
      return;
    }
    setSelectedConversation(conversation);
    if (isMobileViewport) setIsMobileInboxOpen(false);
  };

  const multiChatPresentation = getCustomerSupportMultiChatPresentation(
    isMultiChatMode,
    openChatConversations.length,
    viewportWidth,
  );
  const isMultiChatTabs = multiChatPresentation === 'tabs';
  const inboxPanelVisible = !isMultiChatMode && (isMobileViewport ? isMobileInboxOpen : isInboxSidebarOpen);
  const inboxPanelStyle = isMultiChatMode
    ? {
        position: 'relative' as const,
        width: '0px',
        flex: '0 0 0px',
        minWidth: '0px',
        maxWidth: '0px',
        zIndex: 0,
        visibility: 'hidden' as const,
        pointerEvents: 'none' as const,
      }
    : isMobileViewport
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

  const conversationPanelStyle = isMobileViewport && isMultiChatMode && isMobileConversationsOpen
    ? {
        position: 'absolute' as const,
        left: '56px',
        top: 0,
        bottom: 0,
        width: 'calc(100% - 56px)',
        flex: '0 0 auto',
        minWidth: 0,
        maxWidth: 'none',
        zIndex: 50,
        background: 'white',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.24)',
      }
    : isMobileViewport
    ? {
        position: 'relative' as const,
        width: 'auto',
        flex: '1 1 0%',
        minWidth: 0,
        maxWidth: 'none',
        transition: 'none',
      }
    : isMultiChatMode
    ? {
        position: 'relative' as const,
        width: '260px',
        flex: '0 0 260px',
        minWidth: '260px',
        maxWidth: '260px',
        visibility: 'visible' as const,
        pointerEvents: 'auto' as const,
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
          activeFilter={filter}
          onFilterChange={handleFilterChange}
          unreadCountTotal={unreadCountTotal}
          mineCountTotal={mineCountTotal}
          unassignedCountTotal={unassignedCountTotal}
          onOpenPolicy={() => setIsPolicyModalOpen(true)}
          isLoading={isLoadingConversations}
          onRefresh={loadConversations}
          isRealtimeConnected={isRealtimeConnected}
          isInboxSidebarOpen={inboxPanelVisible}
          onToggleInboxSidebar={handleToggleInboxPanel}
          isConversationSidebarOpen={isMobileViewport
            ? isMultiChatMode ? isMobileConversationsOpen : !selectedConversation
            : isConversationSidebarOpen}
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
      {!isMultiChatMode && <CustomerSupportResizeHandle
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
      />}

      {/* A lista continua montada quando recolhida ou quando o chat ocupa a tela móvel. */}
      <div
        ref={conversationPanelRef}
        id="customer-support-conversations-panel"
        data-testid="customer-support-conversations-panel"
        aria-hidden={isMobileViewport
          ? isMultiChatMode ? !isMobileConversationsOpen : Boolean(selectedConversation)
          : !isConversationSidebarOpen && !isMultiChatMode}
        className={`relative h-full shrink-0 overflow-hidden ${isMobileViewport && (isMultiChatMode
          ? !isMobileConversationsOpen
          : Boolean(selectedConversation)) ? 'hidden' : 'flex'}`}
        style={conversationPanelStyle}
      >
        <ConversationSidebar
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
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
          isMultiChatMode={isMultiChatMode}
          openChatCount={openChatConversations.length}
          onOpenMultiChat={handleEnterMultiChatMode}
          onExitMultiChat={handleExitMultiChatMode}
        />
      </div>
      {!isMultiChatMode && <CustomerSupportResizeHandle
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
      />}

      {/* Coluna 4: Área Principal do Chat (Flex-1) */}
      {isMultiChatMode ? (
        <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
          {isMultiChatTabs && (
            <div role="tablist" aria-label="Chats abertos" className="flex min-h-12 shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-950">
              {openChatConversations.map((conversation) => {
                const displayName = conversation.customer?.fullName
                  || conversation.contactName
                  || conversation.contactPhone;
                const isActive = activeMultiChatId === conversation.id;
                return (
                  <div key={conversation.id} className={`flex min-w-0 max-w-[220px] items-center rounded-lg ${isActive ? 'bg-white shadow-sm dark:bg-slate-900' : ''}`}>
                    <button
                      type="button"
                      role="tab"
                      id={`customer-support-chat-tab-${conversation.id}`}
                      aria-controls={`customer-support-chat-panel-${conversation.id}`}
                      aria-selected={isActive}
                      onClick={() => handleActivateMultiChat(conversation)}
                      className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-xs font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      {displayName}
                    </button>
                    <button
                      type="button"
                      aria-label={`Fechar chat ${displayName}`}
                      onClick={() => handleCloseMultiChat(conversation.id)}
                      className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <i className="bi bi-x-lg text-[10px]" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {openChatConversations
              .filter((conversation) => !isMultiChatTabs || conversation.id === activeMultiChatId)
              .map((conversation) => (
                <div
                  key={conversation.id}
                  id={`customer-support-chat-panel-${conversation.id}`}
                  role={isMultiChatTabs ? 'tabpanel' : undefined}
                  aria-labelledby={isMultiChatTabs ? `customer-support-chat-tab-${conversation.id}` : undefined}
                  className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden"
                >
                  <CustomerSupportChatPane
                    conversation={conversation}
                    teamMembers={agents}
                    isLoadingAgents={isLoadingAgents}
                    agentsError={agentsError}
                    onReloadAgents={() => setAgentReloadKey((key) => key + 1)}
                    setConversations={setConversations}
                    currentUserName={currentUserName}
                    currentUserId={user?.id}
                    currentUserRole={profile?.role}
                    onConversationChanged={handleMultiChatConversationChanged}
                    onSelectConversation={(activeConversation) => {
                      setActiveMultiChatId(activeConversation.id);
                      setSelectedConversation(activeConversation);
                    }}
                    onBackMobile={() => setIsMobileConversationsOpen(true)}
                    isMultiChatPanel
                    onClosePanel={() => handleCloseMultiChat(conversation.id)}
                  />
                </div>
              ))}
          </div>
        </div>
      ) : selectedConversation ? (
        <div className="flex-1 flex h-full min-w-0 md:min-w-[240px] relative">
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
            key={`customer-info-${selectedConversation.id}`}
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
        <div className="hidden md:flex flex-1 h-full min-w-0 md:min-w-[240px]">
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
