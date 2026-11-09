import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { WhatsAppConversation, WhatsAppMessage } from '../types';
import {
  fetchInitialConversationMessagePage,
  fetchConversationReplyTarget,
} from '@/pages/utils/customerSupport/customerSupportService';
import { mergeSupportMessageChanges } from '@/pages/utils/customerSupport/customerSupportMessageSync';
import { useCustomerSupportRealtimeSync } from './useCustomerSupportRealtimeSync';
import { useCustomerSupportHistoryLoader } from './useCustomerSupportHistoryLoader';

const INITIAL_MESSAGE_PAGE_SIZE = 80;

interface UseCustomerSupportMessagesParams {
  selectedConversation: WhatsAppConversation | null;
}

export function useCustomerSupportMessages({
  selectedConversation,
}: UseCustomerSupportMessagesParams) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const messagesRef = useRef<WhatsAppMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const activeConvIdRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const nextConvId = selectedConversation?.id || null;
  if (activeConvIdRef.current !== nextConvId) {
    activeConvIdRef.current = nextConvId;
    generationRef.current += 1;
  }
  const latestRequestRef = useRef(0);
  const pendingLatestRef = useRef<number | null>(null);
  const initializedHistoryRef = useRef<number | null>(null);
  const historyCursorRef = useRef<{ timestamp: string; id: string } | null>(null);
  const historyConversationIdRef = useRef<string | null>(null);
  const syncWatermarkRef = useRef<{ generation: number; value: string | null }>({
    generation: 0,
    value: null,
  });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const {
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
  } = useCustomerSupportHistoryLoader({
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
  });

  const resolveReplyTarget = useCallback(
    async (reference: {
      conversationId: string;
      messageId: string | null;
      apiMessageId: string | null;
    }) => {
      const conversationId = activeConvIdRef.current;
      if (!conversationId || reference.conversationId !== conversationId) return null;
      return fetchConversationReplyTarget(supabase, conversationId, reference);
    },
    []
  );

  const loadMessages = useCallback(async (convId: string, isSilent = false) => {
    if (!convId) return;
    const generation = generationRef.current;
    if (isSilent && pendingLatestRef.current === generation) return;
    const request = ++latestRequestRef.current;
    pendingLatestRef.current = generation;
    if (!isSilent) setIsLoadingMessages(true);
    try {
      const page = await fetchInitialConversationMessagePage(
        supabase,
        convId,
        INITIAL_MESSAGE_PAGE_SIZE
      );
      const latest = page.messages;
      if (generation !== generationRef.current || request !== latestRequestRef.current) return;
      syncWatermarkRef.current = { generation, value: page.watermark };
      historyConversationIdRef.current = convId;
      if (initializedHistoryRef.current !== generation) {
        initializedHistoryRef.current = generation;
        historyCursorRef.current = latest[0]
          ? { timestamp: latest[0].timestamp, id: latest[0].id }
          : null;
        setHasOlderMessages(latest.length === INITIAL_MESSAGE_PAGE_SIZE);
      }
      setMessagesError('');
      setMessages((current) => mergeSupportMessageChanges(current, latest));
    } catch (error) {
      if (generation === generationRef.current && request === latestRequestRef.current) {
        setMessagesError(
          error instanceof Error ? error.message : 'Não foi possível carregar as mensagens.'
        );
      }
    } finally {
      if (generation === generationRef.current && request === latestRequestRef.current) {
        pendingLatestRef.current = null;
        setIsLoadingMessages(false);
      }
    }
  }, [setHasOlderMessages]);

  const { refreshMessages, abortSync } = useCustomerSupportRealtimeSync({
    supabase,
    selectedConversationId: selectedConversation?.id || null,
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
  });

  const lastLoadedConvIdRef = useRef<string | null>(null);
  useEffect(() => {
    const convId = selectedConversation?.id || null;
    if (convId !== lastLoadedConvIdRef.current) {
      abortSync();
      lastLoadedConvIdRef.current = convId;
      loadingOlderRef.current = null;
      setIsLoadingOlderMessages(false);
      setIsLoadingMessages(false);
      setMessagesError('');
      setJumpToMessageId(null);
      messagesRef.current = [];
      historyCursorRef.current = null;
      if (convId) {
        setMessages([]);
        setHasOlderMessages(false);
        const pendingTarget = pendingJumpRef.current;
        pendingJumpRef.current = null;
        if (pendingTarget?.conversationId === convId) {
          void loadMessageContext(convId, pendingTarget, generationRef.current);
        } else {
          void loadMessages(convId);
        }
      } else {
        pendingJumpRef.current = null;
        setMessages([]);
        setHasOlderMessages(false);
      }
    }
  }, [
    selectedConversation?.id,
    loadMessages,
    loadMessageContext,
    abortSync,
    loadingOlderRef,
    setIsLoadingOlderMessages,
    setJumpToMessageId,
    setHasOlderMessages,
    pendingJumpRef,
  ]);

  return {
    messages,
    setMessages,
    resolveReplyTarget,
    jumpToMessage,
    jumpToMessageId,
    clearJumpToMessage,
    isLoadingMessages,
    isLoadingOlderMessages,
    hasOlderMessages: selectedConversation
      ? historyConversationIdRef.current === selectedConversation.id && hasOlderMessages
      : false,
    loadOlderMessages,
    refreshMessages,
    messagesError,
  };
}
