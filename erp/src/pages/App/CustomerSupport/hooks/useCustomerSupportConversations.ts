import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, ConversationFilter } from '../types';
import {
  fetchConversations,
  mapRowToConversation,
} from '@/pages/utils/customerSupport/customerSupportService';
import { SortOrder } from '../components/ConversationSidebar';

interface UseCustomerSupportConversationsParams {
  userId?: string;
}

export function useCustomerSupportConversations({ userId }: UseCustomerSupportConversationsParams) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [search, setSearch] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  const selectedConvIdRef = useRef<string | null>(null);
  selectedConvIdRef.current = selectedConversation?.id || null;

  // Carrega conversas do banco com paginação e busca seletiva
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const res = await fetchConversations(supabase, {
        filter,
        search,
        page: 1,
        pageSize: 50,
        currentUserId: userId,
      });
      setConversations(res.conversations);

      // Mantém a conversa selecionada sincronizada com as atualizações
      if (selectedConvIdRef.current) {
        const found = res.conversations.find((c) => c.id === selectedConvIdRef.current);
        if (found) setSelectedConversation(found);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  }, [filter, search, userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Supabase Realtime para a tabela whatsapp_conversations
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-conversations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConv = mapRowToConversation(payload.new);
            setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRowToConversation(payload.new);
            setConversations((prev) =>
              prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
            );
            if (selectedConvIdRef.current === updated.id) {
              setSelectedConversation((prev) => (prev ? { ...prev, ...updated } : null));
            }
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalAll = conversations.length;
  const unreadCountTotal = conversations.reduce(
    (acc, c) => acc + (c.unreadCount > 0 ? 1 : 0),
    0
  );
  const mineCountTotal = userId
    ? conversations.filter((c) => c.assignedTo === userId).length
    : 0;
  const unassignedCountTotal = conversations.filter((c) => !c.assignedTo).length;

  return {
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
  };
}
