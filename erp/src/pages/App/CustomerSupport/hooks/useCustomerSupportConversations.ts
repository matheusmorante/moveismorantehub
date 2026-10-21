import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, ConversationFilter, CustomerSupportFolderCriteria } from '../types';
import {
  fetchConversationCounts,
  fetchConversations,
  mapRowToConversation,
} from '@/pages/utils/customerSupport/customerSupportService';
import { SortOrder } from '../components/ConversationSidebar';

interface UseCustomerSupportConversationsParams {
  userId?: string;
  agentId?: string | null;
  folderCriteria?: CustomerSupportFolderCriteria | null;
  canViewCommercialInfo?: boolean;
}

const PAGE_SIZE = 50;

export function useCustomerSupportConversations({
  userId,
  agentId = null,
  folderCriteria = null,
  canViewCommercialInfo = false,
}: UseCustomerSupportConversationsParams) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [search, setSearch] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingConversations, setIsRefreshingConversations] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ all: 0, mine: 0, unassigned: 0, unread: 0 });

  const selectedConvIdRef = useRef<string | null>(null);
  selectedConvIdRef.current = selectedConversation?.id || null;
  const loadedPagesRef = useRef(1);
  const requestIdRef = useRef(0);

  const loadConversations = useCallback(async (isSilent = false) => {
    const requestId = ++requestIdRef.current;
    if (!isSilent) {
      loadedPagesRef.current = 1;
      setIsLoadingConversations(true);
    } else {
      setIsRefreshingConversations(true);
    }

    const pagesToLoad = isSilent ? loadedPagesRef.current : 1;
    try {
      const pageResults = await Promise.all(
        Array.from({ length: pagesToLoad }, (_, index) => fetchConversations(supabase, {
          filter: folderCriteria ? 'all' : filter,
          search,
          page: index + 1,
          pageSize: PAGE_SIZE,
          agentId: folderCriteria ? null : agentId,
          criteria: folderCriteria,
          canViewCommercialInfo,
          sortOrder,
        }))
      );
      const rows = pageResults.flatMap((result) => result.conversations);
      const deduplicated = Array.from(new Map(rows.map((row) => [row.id, row])).values());
      if (requestId !== requestIdRef.current) return;
      setConversations(deduplicated);
      setTotalCount(pageResults[0]?.totalCount || 0);

      if (selectedConvIdRef.current) {
        const found = deduplicated.find((conversation) => conversation.id === selectedConvIdRef.current);
        if (found) setSelectedConversation(found);
      }

      const nextCounts = await fetchConversationCounts(supabase);
      if (requestId === requestIdRef.current) setCounts(nextCounts);
    } finally {
      if (requestId === requestIdRef.current) {
        if (!isSilent) setIsLoadingConversations(false);
        setIsRefreshingConversations(false);
      }
    }
  }, [filter, search, userId, agentId, folderCriteria, canViewCommercialInfo, sortOrder]);

  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMore || conversations.length >= totalCount) return;
    const nextPage = loadedPagesRef.current + 1;
    setIsLoadingMore(true);
    try {
      const result = await fetchConversations(supabase, {
        filter: folderCriteria ? 'all' : filter,
        search,
        page: nextPage,
        pageSize: PAGE_SIZE,
        agentId: folderCriteria ? null : agentId,
        criteria: folderCriteria,
        canViewCommercialInfo,
        sortOrder,
      });
      if (result.conversations.length) {
        loadedPagesRef.current = nextPage;
        setConversations((current) => {
          const existing = new Set(current.map((conversation) => conversation.id));
          return [...current, ...result.conversations.filter((conversation) => !existing.has(conversation.id))];
        });
      }
      if (result.totalCount) setTotalCount(result.totalCount);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, conversations.length, totalCount, folderCriteria, filter, search, userId, agentId, canViewCommercialInfo, sortOrder]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void loadConversations(true);
      }
    }, 6000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void loadConversations(true);
    };
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadConversations]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const setupChannel = () => {
      if (channel) void supabase.removeChannel(channel);
      channel = supabase
        .channel(`whatsapp-conversations-realtime-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
          void loadConversations(true);
        })
        .subscribe((status) => {
          const connected = status === 'SUBSCRIBED';
          setIsRealtimeConnected(connected);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(setupChannel, 3000);
          }
        });
    };
    setupChannel();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadConversations]);

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
    isLoadingMore,
    isRefreshingConversations,
    isRealtimeConnected,
    loadConversations,
    loadMoreConversations,
    totalCount,
    hasMoreConversations: conversations.length < totalCount,
    totalAll: counts.all,
    unreadCountTotal: counts.unread,
    mineCountTotal: counts.mine,
    unassignedCountTotal: counts.unassigned,
  };
}
