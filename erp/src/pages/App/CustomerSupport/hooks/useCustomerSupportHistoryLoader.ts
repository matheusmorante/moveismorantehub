import { useState, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '../types';
import {
  fetchInitialConversationMessagePage,
  fetchConversationMessageContext,
} from '@/pages/utils/customerSupport/customerSupportService';
import { useOlderMessagesPaging } from './history/useOlderMessagesPaging';

interface UseCustomerSupportHistoryLoaderParams {
  supabase: SupabaseClient;
  activeConvIdRef: React.MutableRefObject<string | null>;
  generationRef: React.MutableRefObject<number>;
  latestRequestRef: React.MutableRefObject<number>;
  pendingLatestRef: React.MutableRefObject<number | null>;
  syncWatermarkRef: React.MutableRefObject<{ generation: number; value: string | null }>;
  historyCursorRef: React.MutableRefObject<{ timestamp: string; id: string } | null>;
  historyConversationIdRef: React.MutableRefObject<string | null>;
  initializedHistoryRef: React.MutableRefObject<number | null>;
  messagesRef: React.MutableRefObject<WhatsAppMessage[]>;
  setMessages: React.Dispatch<React.SetStateAction<WhatsAppMessage[]>>;
  setIsLoadingMessages: React.Dispatch<React.SetStateAction<boolean>>;
  setMessagesError: React.Dispatch<React.SetStateAction<string>>;
}

export function useCustomerSupportHistoryLoader({
  supabase,
  activeConvIdRef,
  generationRef,
  latestRequestRef,
  pendingLatestRef,
  syncWatermarkRef,
  historyCursorRef,
  historyConversationIdRef,
  initializedHistoryRef,
  messagesRef,
  setMessages,
  setIsLoadingMessages,
  setMessagesError,
}: UseCustomerSupportHistoryLoaderParams) {
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const pendingJumpRef = useRef<WhatsAppMessage | null>(null);

  const {
    isLoadingOlderMessages,
    setIsLoadingOlderMessages,
    hasOlderMessages,
    setHasOlderMessages,
    loadingOlderRef,
    loadOlderMessages,
  } = useOlderMessagesPaging({
    supabase,
    activeConvIdRef,
    generationRef,
    historyConversationIdRef,
    historyCursorRef,
    setMessages,
    setMessagesError,
  });

  const clearJumpToMessage = useCallback(() => setJumpToMessageId(null), []);

  const loadMessageContext = useCallback(
    async (
      convId: string,
      target: WhatsAppMessage,
      generation: number,
      mergeWithCurrent = false
    ) => {
      if (!convId || target.conversationId !== convId) return;
      const request = ++latestRequestRef.current;
      pendingLatestRef.current = generation;
      setIsLoadingMessages(true);
      setMessagesError('');
      try {
        const needsWatermark = syncWatermarkRef.current.generation !== generation;
        const [context, anchor] = await Promise.all([
          fetchConversationMessageContext(supabase, convId, target.id),
          needsWatermark ? fetchInitialConversationMessagePage(supabase, convId, 1) : null,
        ]);
        if (generation !== generationRef.current || request !== latestRequestRef.current) return;
        if (anchor) syncWatermarkRef.current = { generation, value: anchor.watermark };
        historyConversationIdRef.current = convId;
        initializedHistoryRef.current = generation;
        if (!mergeWithCurrent || !historyCursorRef.current) {
          historyCursorRef.current = context.messages[0]
            ? { timestamp: context.messages[0].timestamp, id: context.messages[0].id }
            : null;
          setHasOlderMessages(context.hasOlderMessages);
        } else {
          setHasOlderMessages((current) => current || context.hasOlderMessages);
        }
        setMessages((current) => {
          const combined = new Map(
            (mergeWithCurrent ? current : []).map((message) => [message.id, message])
          );
          context.messages.forEach((message) =>
            combined.set(message.id, { ...combined.get(message.id), ...message })
          );
          return Array.from(combined.values()).sort(
            (a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
          );
        });
        setJumpToMessageId(target.id);
      } catch (error) {
        if (generation === generationRef.current && request === latestRequestRef.current) {
          setMessagesError(
            error instanceof Error
              ? error.message
              : 'Não foi possível abrir essa mensagem no histórico.'
          );
        }
      } finally {
        if (generation === generationRef.current && request === latestRequestRef.current) {
          pendingLatestRef.current = null;
          setIsLoadingMessages(false);
        }
      }
    },
    [
      generationRef,
      historyConversationIdRef,
      historyCursorRef,
      initializedHistoryRef,
      latestRequestRef,
      pendingLatestRef,
      setHasOlderMessages,
      setIsLoadingMessages,
      setMessages,
      setMessagesError,
      supabase,
      syncWatermarkRef,
    ]
  );

  const jumpToMessage = useCallback(
    (message: WhatsAppMessage) => {
      if (!message.id) return;
      if (message.conversationId !== activeConvIdRef.current) {
        pendingJumpRef.current = message;
        return;
      }
      pendingJumpRef.current = null;
      if (messagesRef.current.some((item) => item.id === message.id)) {
        setJumpToMessageId(message.id);
        return;
      }
      void loadMessageContext(message.conversationId, message, generationRef.current, true);
    },
    [activeConvIdRef, generationRef, loadMessageContext, messagesRef]
  );

  return {
    jumpToMessageId,
    setJumpToMessageId,
    pendingJumpRef,
    clearJumpToMessage,
    loadMessageContext,
    jumpToMessage,
    hasOlderMessages,
    setHasOlderMessages,
    isLoadingOlderMessages,
    setIsLoadingOlderMessages,
    loadingOlderRef,
    loadOlderMessages,
  };
}
