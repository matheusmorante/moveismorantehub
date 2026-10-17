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
  const [isRefreshingConversations, setIsRefreshingConversations] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  const selectedConvIdRef = useRef<string | null>(null);
  selectedConvIdRef.current = selectedConversation?.id || null;

  // Carrega conversas do banco com paginação e busca seletiva
  const loadConversations = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setIsLoadingConversations(true);
      } else {
        setIsRefreshingConversations(true);
      }
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
          if (found) {
            setSelectedConversation((prev) => {
              if (!prev) return found;
              if (
                prev.id === found.id &&
                prev.lastMessageAt === found.lastMessageAt &&
                prev.lastMessageText === found.lastMessageText &&
                prev.unreadCount === found.unreadCount &&
                prev.status === found.status &&
                prev.assignedTo === found.assignedTo &&
                prev.customerLinkStatus === found.customerLinkStatus &&
                prev.customerId === found.customerId &&
                prev.isArchived === found.isArchived
              ) {
                return prev;
              }
              return found;
            });
          }
        }
      } finally {
        if (!isSilent) setIsLoadingConversations(false);
        setIsRefreshingConversations(false);
      }
    },
    [filter, search, userId]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Atualização periódica automática em segundo plano (auto-reload a cada 6 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        loadConversations(true);
      }
    }, 6000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadConversations(true);
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadConversations]);

  // Supabase Realtime para a tabela whatsapp_conversations com reconexão resiliente
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: any = null;

    const setupChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
      }

      channel = supabase
        .channel(`whatsapp-conversations-realtime-${Date.now()}`)
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
                setSelectedConversation((prev) => {
                  if (!prev) return null;
                  if (
                    prev.id === updated.id &&
                    prev.lastMessageAt === updated.lastMessageAt &&
                    prev.lastMessageText === updated.lastMessageText &&
                    prev.unreadCount === updated.unreadCount &&
                    prev.status === updated.status &&
                    prev.assignedTo === updated.assignedTo &&
                    prev.customerLinkStatus === updated.customerLinkStatus &&
                    prev.customerId === updated.customerId &&
                    prev.isArchived === updated.isArchived
                  ) {
                    return prev;
                  }
                  return { ...prev, ...updated };
                });
              }
            }
          }
        )
        .subscribe((status) => {
          const ok = status === 'SUBSCRIBED';
          setIsRealtimeConnected(ok);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              setupChannel();
            }, 3000);
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
    isRefreshingConversations,
    isRealtimeConnected,
    loadConversations,
    totalAll,
    unreadCountTotal,
    mineCountTotal,
    unassignedCountTotal,
  };
}
