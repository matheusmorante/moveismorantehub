import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, WhatsAppMessage } from '../types';
import {
  fetchConversationMessages,
  fetchPreviousConversationMessages,
  fetchConversationReplyTarget,
  markConversationAsRead,
  mapRowToMessage,
} from '@/pages/utils/customerSupport/customerSupportService';

const INITIAL_MESSAGE_PAGE_SIZE = 80;
const OLDER_MESSAGE_PAGE_SIZE = 50;

interface UseCustomerSupportMessagesParams {
  selectedConversation: WhatsAppConversation | null;
  onClearUnread: (conversationId: string) => void;
}

export function useCustomerSupportMessages({
  selectedConversation,
  onClearUnread,
}: UseCustomerSupportMessagesParams) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const messagesRef = useRef<WhatsAppMessage[]>([]);
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isRefreshingMessages, setIsRefreshingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [readError, setReadError] = useState('');
  const activeConvIdRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const nextConvId = selectedConversation?.id || null;
  if (activeConvIdRef.current !== nextConvId) {
    activeConvIdRef.current = nextConvId;
    generationRef.current += 1;
  }
  const onClearUnreadRef = useRef(onClearUnread);
  onClearUnreadRef.current = onClearUnread;
  const loadingOlderRef = useRef<number | null>(null);
  const latestRequestRef = useRef(0);
  const pendingLatestRef = useRef<number | null>(null);
  const initializedHistoryRef = useRef<number | null>(null);
  // A quoted message can sit outside the contiguous history already fetched.
  const historyCursorRef = useRef<{ timestamp: string; id: string } | null>(null);
  const readRequestRef = useRef(0);
  const readNeedsRetryRef = useRef(false);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const resolveReplyTarget = useCallback(async (reference: {
    conversationId: string;
    messageId: string | null;
    apiMessageId: string | null;
  }) => {
    const conversationId = activeConvIdRef.current;
    if (!conversationId || reference.conversationId !== conversationId) return null;
    return fetchConversationReplyTarget(supabase, conversationId, reference);
  }, []);

  const jumpToMessage = useCallback((message: WhatsAppMessage) => {
    if (!message.id || message.conversationId !== activeConvIdRef.current) return;
    const current = messagesRef.current;
    if (!current.some((item) => item.id === message.id)) {
      const oldest = current[0];
      if (oldest && (message.timestamp < oldest.timestamp || (message.timestamp === oldest.timestamp && message.id < oldest.id))) {
        setHasOlderMessages(true);
      }
      setMessages((existing) => existing.some((item) => item.id === message.id)
        ? existing
        : [...existing, message].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id))
      );
    }
    setJumpToMessageId(message.id);
  }, []);

  const clearJumpToMessage = useCallback(() => setJumpToMessageId(null), []);
  const confirmRead = useCallback(async (convId: string) => {
    const generation = generationRef.current;
    const request = ++readRequestRef.current;
    const confirmed = await markConversationAsRead(supabase, convId);
    if (generation !== generationRef.current || request !== readRequestRef.current) return;
    readNeedsRetryRef.current = !confirmed;
    setReadError(confirmed ? '' : 'Não foi possível confirmar a leitura. Atualize a conversa para tentar novamente.');
    if (confirmed) onClearUnreadRef.current(convId);
  }, []);

  const loadMessages = useCallback(async (convId: string, isSilent = false) => {
    if (!convId) return;
    const generation = generationRef.current;
    if (isSilent && pendingLatestRef.current === generation) return;
    const request = ++latestRequestRef.current;
    pendingLatestRef.current = generation;
    if (!isSilent) setIsLoadingMessages(true);
    try {
      const latest = await fetchConversationMessages(supabase, convId, INITIAL_MESSAGE_PAGE_SIZE);
      if (generation !== generationRef.current || request !== latestRequestRef.current) return;
      if (initializedHistoryRef.current !== generation) {
        initializedHistoryRef.current = generation;
        historyCursorRef.current = latest[0]
          ? { timestamp: latest[0].timestamp, id: latest[0].id }
          : null;
        setHasOlderMessages(latest.length === INITIAL_MESSAGE_PAGE_SIZE);
      }
      setMessagesError('');
      setMessages((current) => {
        if (!isSilent || current.length === 0) return latest;
        const combined = new Map(current.map((message) => [message.id, message]));
        latest.forEach((message) => combined.set(message.id, { ...combined.get(message.id), ...message }));
        return Array.from(combined.values()).sort((a, b) =>
          a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
        );
      });
    } catch (error) {
      if (generation === generationRef.current && request === latestRequestRef.current) {
        setMessagesError(error instanceof Error ? error.message : 'Não foi possível carregar as mensagens.');
      }
    } finally {
      if (generation === generationRef.current && request === latestRequestRef.current) {
        pendingLatestRef.current = null;
        setIsLoadingMessages(false);
      }
    }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    const convId = activeConvIdRef.current;
    const generation = generationRef.current;
    if (!convId || loadingOlderRef.current === generation || !hasOlderMessages) return 0;
    const oldest = historyCursorRef.current;
    if (!oldest) return 0;
    loadingOlderRef.current = generation;
    setIsLoadingOlderMessages(true);
    try {
      const older = await fetchPreviousConversationMessages(
        supabase,
        convId,
        { timestamp: oldest.timestamp, id: oldest.id },
        OLDER_MESSAGE_PAGE_SIZE
      );
      if (generation !== generationRef.current) return 0;
      setHasOlderMessages(older.length === OLDER_MESSAGE_PAGE_SIZE);
      setMessagesError('');
      if (older.length) {
        historyCursorRef.current = { timestamp: older[0].timestamp, id: older[0].id };
        setMessages((current) => {
          const existing = new Set(current.map((message) => message.id));
          return [...older.filter((message) => !existing.has(message.id)), ...current].sort((a, b) =>
            a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
          );
        });
      }
      return older.length;
    } catch (error) {
      if (generation === generationRef.current) {
        setMessagesError(error instanceof Error ? error.message : 'Não foi possível carregar as mensagens anteriores.');
      }
      return 0;
    } finally {
      if (loadingOlderRef.current === generation) {
        loadingOlderRef.current = null;
        setIsLoadingOlderMessages(false);
      }
    }
  }, [hasOlderMessages]);

  const lastLoadedConvIdRef = useRef<string | null>(null);
  useEffect(() => {
    const convId = selectedConversation?.id || null;
    const unreadCount = selectedConversation?.unreadCount || 0;
    if (convId !== lastLoadedConvIdRef.current) {
      lastLoadedConvIdRef.current = convId;
      loadingOlderRef.current = null;
      setIsLoadingOlderMessages(false);
      setIsLoadingMessages(false);
      setIsRefreshingMessages(false);
      setMessagesError('');
      setReadError('');
      setJumpToMessageId(null);
      messagesRef.current = [];
      historyCursorRef.current = null;
      readNeedsRetryRef.current = false;
      if (convId) {
        setMessages([]);
        setHasOlderMessages(false);
        void loadMessages(convId);
      } else {
        setMessages([]);
        setHasOlderMessages(false);
      }
    }
    // A lista também recupera mensagens cujo evento Realtime não chegou.
    if (convId && unreadCount > 0) void confirmRead(convId);
  }, [selectedConversation?.id, selectedConversation?.unreadCount, loadMessages, confirmRead]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentId = activeConvIdRef.current;
      if (currentId && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
        void loadMessages(currentId, true);
      }
    }, 6000);
    const handleVisibilityChange = () => {
      const currentId = activeConvIdRef.current;
      if (currentId && document.visibilityState === 'visible') void loadMessages(currentId, true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadMessages]);

  useEffect(() => {
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
          if (!isCurrent()) return;
          if (payload.eventType === 'INSERT') {
            const newMessage = mapRowToMessage(payload.new);
            if (activeConvIdRef.current !== newMessage.conversationId) return;
            if (newMessage.direction === 'inbound') {
              void confirmRead(newMessage.conversationId);
            }
            setMessages((current) => {
              if (current.some((message) => message.id === newMessage.id || (
                message.apiMessageId && message.apiMessageId === newMessage.apiMessageId
              ))) return current;
              return [...current, newMessage].sort((a, b) =>
                a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = mapRowToMessage(payload.new);
            if (activeConvIdRef.current === updatedMessage.conversationId) {
              setMessages((current) => current.map((message) =>
                message.id === updatedMessage.id ? { ...message, ...updatedMessage } : message
              ));
            }
          }
        })
        .subscribe((status) => {
          if (!isCurrent()) return;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = null;
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
  }, [confirmRead]);

  const refreshMessages = useCallback(async () => {
    const currentId = activeConvIdRef.current;
    if (!currentId) return;
    setIsRefreshingMessages(true);
    const generation = generationRef.current;
    try {
      await Promise.all([loadMessages(currentId, true), readNeedsRetryRef.current ? confirmRead(currentId) : undefined]);
    } finally {
      if (generation === generationRef.current) setIsRefreshingMessages(false);
    }
  }, [loadMessages, confirmRead]);

  return {
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
    refreshMessages,
    messagesError: messagesError || readError,
  };
}
