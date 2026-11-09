import { useCallback, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
import { sendCustomerSupportMessage } from '@/pages/utils/customerSupport/customerSupportService';

interface UseCustomerSupportPageActionsParams {
  supabase: SupabaseClient;
  selectedConversation: WhatsAppConversation | null;
  setIsInfoPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTimelineOpen: React.Dispatch<React.SetStateAction<boolean>>;
  jumpToMessage: (message: WhatsAppMessage) => void;
}

export function useCustomerSupportPageActions({
  supabase,
  selectedConversation,
  setIsInfoPanelOpen,
  setIsTimelineOpen,
  jumpToMessage,
}: UseCustomerSupportPageActionsParams) {
  const [shareOrderRequest, setShareOrderRequest] = useState<{
    conversationId: string;
    requestId: string;
    record: SupportOrderSummary;
  } | null>(null);

  const handleToggleInfoPanel = useCallback(() => {
    setIsInfoPanelOpen((prev) => {
      const next = !prev;
      if (next) setIsTimelineOpen(false);
      return next;
    });
  }, [setIsInfoPanelOpen, setIsTimelineOpen]);

  const handleToggleTimeline = useCallback(() => {
    setIsTimelineOpen((prev) => {
      const next = !prev;
      if (next) setIsInfoPanelOpen(false);
      return next;
    });
  }, [setIsInfoPanelOpen, setIsTimelineOpen]);

  const handleSendCustomerMessage = useCallback(
    (input: Parameters<typeof sendCustomerSupportMessage>[2]) => {
      if (!selectedConversation) return Promise.reject(new Error('Nenhuma conversa selecionada'));
      return sendCustomerSupportMessage(supabase, selectedConversation.id, input);
    },
    [supabase, selectedConversation]
  );

  const handleShareBudget = useCallback(
    (record: SupportOrderSummary) => {
      if (!selectedConversation) return;
      setShareOrderRequest({
        conversationId: selectedConversation.id,
        requestId: `${Date.now()}-${Math.random()}`,
        record,
      });
    },
    [selectedConversation]
  );

  const handleShareOrderRequestHandled = useCallback((requestId: string) => {
    setShareOrderRequest((current) => (current?.requestId === requestId ? null : current));
  }, []);

  const handleJumpToMessageFromPanel = useCallback(
    (message: Parameters<typeof jumpToMessage>[0]) => {
      jumpToMessage(message);
      setIsInfoPanelOpen(false);
    },
    [jumpToMessage, setIsInfoPanelOpen]
  );

  return {
    shareOrderRequest,
    handleToggleInfoPanel,
    handleToggleTimeline,
    handleSendCustomerMessage,
    handleShareBudget,
    handleShareOrderRequestHandled,
    handleJumpToMessageFromPanel,
  };
}
