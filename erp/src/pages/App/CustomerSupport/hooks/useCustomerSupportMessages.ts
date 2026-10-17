import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, WhatsAppMessage } from '../types';
import {
  fetchConversationMessages,
  markConversationAsRead,
  mapRowToMessage,
} from '@/pages/utils/customerSupport/customerSupportService';

interface UseCustomerSupportMessagesParams {
  selectedConversation: WhatsAppConversation | null;
  onClearUnread: (conversationId: string) => void;
}

export function useCustomerSupportMessages({
  selectedConversation,
  onClearUnread,
}: UseCustomerSupportMessagesParams) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isRefreshingMessages, setIsRefreshingMessages] = useState(false);

  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = selectedConversation?.id || null;

  const onClearUnreadRef = useRef(onClearUnread);
  onClearUnreadRef.current = onClearUnread;

  // Carrega histórico de mensagens da conversa (apenas leitura, sem escrita em whatsapp_conversations)
  const loadMessages = useCallback(async (convId: string, isSilent = false) => {
    if (!convId) return;
    if (!isSilent) setIsLoadingMessages(true);

    try {
      const msgs = await fetchConversationMessages(supabase, convId);
      if (activeConvIdRef.current === convId) {
        setMessages((prev) => {
          if (prev.length === msgs.length) {
            const lastPrev = prev[prev.length - 1];
            const lastNew = msgs[msgs.length - 1];
            if (lastPrev?.id === lastNew?.id && lastPrev?.status === lastNew?.status) {
              return prev; // Conteúdo idêntico, preserva referência para não causar re-render
            }
          }
          return msgs;
        });
      }
    } finally {
      if (!isSilent) setIsLoadingMessages(false);
    }
  }, []);

  // Ao trocar de conversa, limpa, carrega e zera não lidas apenas uma vez
  const lastLoadedConvIdRef = useRef<string | null>(null);
  useEffect(() => {
    const convId = selectedConversation?.id || null;
    if (convId !== lastLoadedConvIdRef.current) {
      lastLoadedConvIdRef.current = convId;
      if (convId && selectedConversation) {
        loadMessages(convId, false);
        // Se tinha mensagens não lidas, zera de forma atômica apenas na abertura da conversa
        if (selectedConversation.unreadCount > 0) {
          markConversationAsRead(supabase, convId);
          onClearUnreadRef.current(convId);
        }
      } else {
        setMessages([]);
      }
    }
  }, [selectedConversation?.id, loadMessages]);

  // Sincronização periódica automática em segundo plano (auto-reload a cada 6 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentId = activeConvIdRef.current;
      if (currentId && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
        loadMessages(currentId, true);
      }
    }, 6000);

    const handleVisibilityChange = () => {
      const currentId = activeConvIdRef.current;
      if (currentId && document.visibilityState === 'visible') {
        loadMessages(currentId, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadMessages]);

  // Supabase Realtime para mensagens da conversa aberta com reconexão automática
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: any = null;

    const setupChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
      }

      channel = supabase
        .channel(`whatsapp-messages-realtime-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'whatsapp_messages' },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = mapRowToMessage(payload.new);
              if (activeConvIdRef.current === newMsg.conversationId) {
                // Se for recebimento na conversa ativa, zera o status de não lida
                if (newMsg.direction === 'inbound') {
                  await markConversationAsRead(supabase, newMsg.conversationId);
                  onClearUnreadRef.current(newMsg.conversationId);
                }
                setMessages((prev) => {
                  if (
                    prev.some(
                      (m) =>
                        m.id === newMsg.id ||
                        (m.apiMessageId && m.apiMessageId === newMsg.apiMessageId)
                    )
                  ) {
                    return prev;
                  }
                  return [...prev, newMsg];
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedMsg = mapRowToMessage(payload.new);
              if (activeConvIdRef.current === updatedMsg.conversationId) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
                );
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              setupChannel();
            }, 5000);
          }
        });
    };

    setupChannel();

    return () => {
      clearTimeout(reconnectTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const refreshMessages = useCallback(async () => {
    const currentId = activeConvIdRef.current;
    if (currentId) {
      setIsRefreshingMessages(true);
      try {
        await loadMessages(currentId, false);
      } finally {
        setIsRefreshingMessages(false);
      }
    }
  }, [loadMessages]);

  return {
    messages,
    setMessages,
    isLoadingMessages,
    isRefreshingMessages,
    refreshMessages,
  };
}
