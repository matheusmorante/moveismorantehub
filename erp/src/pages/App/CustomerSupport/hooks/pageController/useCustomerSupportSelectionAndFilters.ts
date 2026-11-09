import { useCallback } from 'react';
import type { WhatsAppConversation, ConversationFilter } from '../../types';

interface UseCustomerSupportSelectionAndFiltersParams {
  setActiveAgentId: (id: string | null) => void;
  setFilter: (filter: ConversationFilter) => void;
  isMobileViewport: boolean;
  setIsMobileInboxOpen: (open: boolean) => void;
  setSelectedConversation: (conv: WhatsAppConversation | null) => void;
  setIsConversationSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useCustomerSupportSelectionAndFilters({
  setActiveAgentId,
  setFilter,
  isMobileViewport,
  setIsMobileInboxOpen,
  setSelectedConversation,
  setIsConversationSidebarOpen,
}: UseCustomerSupportSelectionAndFiltersParams) {
  const handleFilterChange = useCallback((nextFilter: ConversationFilter) => {
    setActiveAgentId(null);
    setFilter(nextFilter);
  }, [setActiveAgentId, setFilter]);

  const handleSelectAgent = useCallback((agentId: string | null) => {
    setActiveAgentId(agentId);
    setFilter('all');
  }, [setActiveAgentId, setFilter]);

  const handleToggleConversationPanel = useCallback(() => {
    if (isMobileViewport) {
      setIsMobileInboxOpen(false);
      setSelectedConversation(null);
    } else {
      setIsConversationSidebarOpen((open) => !open);
    }
  }, [isMobileViewport, setIsMobileInboxOpen, setSelectedConversation, setIsConversationSidebarOpen]);

  const handleSelectConversation = useCallback((conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    if (isMobileViewport) setIsMobileInboxOpen(false);
  }, [isMobileViewport, setIsMobileInboxOpen, setSelectedConversation]);

  return {
    handleFilterChange,
    handleSelectAgent,
    handleToggleConversationPanel,
    handleSelectConversation,
  };
}
