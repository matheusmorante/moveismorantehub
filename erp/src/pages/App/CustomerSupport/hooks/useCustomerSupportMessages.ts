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

  const selectedConvIdRef = useRef<string | null>(null);
  selectedConvIdRef.current = selectedConversation?.id || null;

  // Carrega histórico de mensagens da conversa selecionada
  const loadMessages = useCallback(async (conv: WhatsAppConversation) => {
    setIsLoadingMessages(true);
    try {
      if (conv.unreadCount > 0) {
        await markConversationAsRead(supabase, conv.id);
        onClearUnread(conv.id);
      }
      const msgs = await fetchConversationMessages(supabase, conv.id);
      setMessages(msgs);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [onClearUnread]);

  // Ao trocar de conversa, limpa e carrega as mensagens
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id, loadMessages]);

  // Supabase Realtime para mensagens da conversa aberta
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = mapRowToMessage(payload.new);
            if (selectedConvIdRef.current === newMsg.conversationId) {
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
            if (selectedConvIdRef.current === updatedMsg.conversationId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    messages,
    setMessages,
    isLoadingMessages,
  };
}
