import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  useCustomerSupportConversations,
  useCustomerSupportMessages,
  useCustomerSupportActions,
} from './index';
import { useCustomerSupportPanelLayout } from './useCustomerSupportPanelLayout';
import { useCustomerSupportAgents } from './useCustomerSupportAgents';
import { useCustomerSupportFolderManagement } from './pageController/useCustomerSupportFolderManagement';
import { useCustomerSupportPageActions } from './pageController/useCustomerSupportPageActions';
import { useCustomerSupportSelectionAndFilters } from './pageController/useCustomerSupportSelectionAndFilters';

export function useCustomerSupportPageController() {
  const { user, profile } = useAuth();
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isAiAgentModalOpen, setIsAiAgentModalOpen] = useState(false);

  const roles = profile ? getProfileRoles(profile) : [];
  const canViewCommercialInfo = canPerform('viewCustomerCommercialInfo', roles);

  const {
    folders,
    selectedFolder,
    saveFolder,
    removeFolder,
    handleDeleteFolder,
  } = useCustomerSupportFolderManagement(user?.id);

  const {
    agents,
    isLoadingAgents,
    agentsError,
    activeAgentId,
    setActiveAgentId,
    reloadAgents,
  } = useCustomerSupportAgents(supabase, user?.id);

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

  // 2. Mensagens da conversa ativa
  const {
    messages,
    setMessages,
    isLoadingMessages,
    isLoadingOlderMessages,
    hasOlderMessages,
    loadOlderMessages,
    messagesError,
    refreshMessages,
    resolveReplyTarget,
    jumpToMessage,
    jumpToMessageId,
    clearJumpToMessage,
  } = useCustomerSupportMessages({
    conversationId: selectedConversation?.id || null,
  });

  const currentUserName = profile?.full_name || user?.email || 'Atendente';

  // 3. Ações no chat (status, notas, tags, reatribuição e atualização de status de IA)
  const {
    handleToggleArchive,
    handleToggleReadStatus,
    handleConversationUpdated,
    handleAssignConversation,
    handleUpdateStatus,
    handleUpdateAiStatus,
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

  const {
    shareOrderRequest,
    handleToggleInfoPanel,
    handleToggleTimeline,
    handleSendCustomerMessage,
    handleShareBudget,
    handleShareOrderRequestHandled,
    handleJumpToMessageFromPanel,
  } = useCustomerSupportPageActions({
    supabase,
    selectedConversation,
    setIsInfoPanelOpen,
    setIsTimelineOpen,
    jumpToMessage,
  });

  const {
    handleFilterChange,
    handleSelectAgent,
    handleToggleConversationPanel,
    handleSelectConversation,
  } = useCustomerSupportSelectionAndFilters({
    setActiveAgentId,
    setFilter,
    isMobileViewport,
    setIsMobileInboxOpen,
    setSelectedConversation,
    setIsConversationSidebarOpen,
  });

  const activityRefreshKey = messages
    .filter(
      (message) => message.messageType === 'internal_note' || message.messageType === 'system_event'
    )
    .map((message) => message.id)
    .join('|');

  return {
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
    folders,
    selectedFolder,
    saveFolder,
    removeFolder,
    handleDeleteFolder,
  };
}
