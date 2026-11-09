import { useCallback, useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '../types';
import {
  fetchConversationMessageChanges,
  mapRowToMessage,
} from '@/pages/utils/customerSupport/customerSupportService';
import { mergeSupportMessageChanges } from '@/pages/utils/customerSupport/customerSupportMessageSync';

interface UseCustomerSupportRealtimeSyncParams {
  supabase: SupabaseClient;
  selectedConversationId: string | null;
  activeConvIdRef: React.MutableRefObject<string | null>;
  generationRef: React.MutableRefObject<number>;
  latestRequestRef: React.MutableRefObject<number>;
  pendingLatestRef: React.MutableRefObject<number | null>;
  initializedHistoryRef: React.MutableRefObject<number | null>;
  syncWatermarkRef: React.MutableRefObject<{ generation: number; value: string | null }>;
  messagesRef: React.MutableRefObject<WhatsAppMessage[]>;
  setMessages: React.Dispatch<React.SetStateAction<WhatsAppMessage[]>>;
  setMessagesError: (error: string) => void;
  loadMessages: (convId: string, isSilent?: boolean) => Promise<void>;
}

export function useCustomerSupportRealtimeSync({
  supabase,
  selectedConversationId,
  activeConvIdRef,
  generationRef,
  latestRequestRef,
  pendingLatestRef,
  initializedHistoryRef,
  syncWatermarkRef,
  messagesRef,
  setMessages,
  setMessagesError,
  loadMessages,
}: UseCustomerSupportRealtimeSyncParams) {
  const syncControllerRef = useRef<AbortController | null>(null);
  const syncPendingRef = useRef<number | null>(null);

  const syncMessages = useCallback(async () => {
    const convId = activeConvIdRef.current;
    const generation = generationRef.current;
    if (!convId || syncPendingRef.current === generation || pendingLatestRef.current === generation) return;
    if (initializedHistoryRef.current !== generation) {
      await loadMessages(convId, true);
      return;
    }
    syncControllerRef.current?.abort();
    const controller = new AbortController();
    syncControllerRef.current = controller;
    syncPendingRef.current = generation;
    const request = latestRequestRef.current;
    try {
      const response = await fetchConversationMessageChanges(
        supabase,
        convId,
        syncWatermarkRef.current.generation === generation ? syncWatermarkRef.current.value : null,
        messagesRef.current,
        controller.signal
      );
      if (controller.signal.aborted || generation !== generationRef.current || request !== latestRequestRef.current) return;
      syncWatermarkRef.current = { generation, value: response.watermark };
      setMessages((current) => mergeSupportMessageChanges(current, response.messages));
      setMessagesError('');
    } catch (error) {
      if (!controller.signal.aborted && generation === generationRef.current) {
        setMessagesError(error instanceof Error ? error.message : 'Não foi possível atualizar as mensagens.');
      }
    } finally {
      if (syncPendingRef.current === generation) syncPendingRef.current = null;
    }
  }, [supabase, activeConvIdRef, generationRef, pendingLatestRef, initializedHistoryRef, latestRequestRef, syncWatermarkRef, messagesRef, setMessages, setMessagesError, loadMessages]);

  const abortSync = useCallback(() => {
    syncControllerRef.current?.abort();
    syncPendingRef.current = null;
  }, []);

  // Polling e detecção de visibilidade
  useEffect(() => {
    const interval = setInterval(() => {
      const currentId = activeConvIdRef.current;
      if (currentId && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
        void syncMessages();
      }
    }, 30_000);
    const handleVisibilityChange = () => {
      const currentId = activeConvIdRef.current;
      if (currentId && document.visibilityState === 'visible') void syncMessages();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleVisibilityChange);
      syncControllerRef.current?.abort();
    };
  }, [syncMessages, activeConvIdRef]);

  // Canal Realtime do Supabase
  useEffect(() => {
    if (!selectedConversationId) return;
    let active = true;
    let channelGeneration = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const setupChannel = () => {
      if (!active) return;
      const generation = ++channelGeneration;
      const isCurrent = () => active && generation === channelGeneration;
      if (channel) void supabase.removeChannel(channel);
      channel = supabase
        .channel(`whatsapp-messages-realtime-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'whatsapp_messages', filter: `conversation_id=eq.${selectedConversationId}` },
          (payload) => {
            if (!isCurrent()) return;
            if (payload.eventType === 'INSERT') {
              const newMessage = mapRowToMessage(payload.new);
              if (activeConvIdRef.current !== newMessage.conversationId) return;
              setMessages((current) => {
                if (
                  current.some(
                    (message) =>
                      message.id === newMessage.id ||
                      (message.apiMessageId && message.apiMessageId === newMessage.apiMessageId)
                  )
                ) {
                  return current;
                }
                return mergeSupportMessageChanges(current, [newMessage]);
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedMessage = mapRowToMessage(payload.new);
              if (activeConvIdRef.current === updatedMessage.conversationId) {
                setMessages((current) => mergeSupportMessageChanges(current, [updatedMessage]));
              }
            }
          }
        )
        .subscribe((status) => {
          if (!isCurrent()) return;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = null;
          if (status === 'SUBSCRIBED') void syncMessages();
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            reconnectTimer = setTimeout(setupChannel, 5000);
          }
        });
    };

    setupChannel();
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, selectedConversationId, syncMessages, activeConvIdRef, setMessages]);

  const refreshMessages = useCallback(async () => {
    const currentId = activeConvIdRef.current;
    if (!currentId) return;
    await syncMessages();
  }, [syncMessages, activeConvIdRef]);

  return {
    syncMessages,
    refreshMessages,
    abortSync,
  };
}
