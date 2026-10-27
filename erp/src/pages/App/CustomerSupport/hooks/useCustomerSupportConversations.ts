import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, ConversationFilter, CustomerSupportFolderCriteria } from '../types';
import {
  fetchConversationCounts,
  fetchConversations,
} from '@/pages/utils/customerSupport/customerSupportService';
import { SortOrder } from '../components/ConversationSidebar';

interface UseCustomerSupportConversationsParams {
  agentId?: string | null;
  folderCriteria?: CustomerSupportFolderCriteria | null;
  canViewCommercialInfo?: boolean;
}

const PAGE_SIZE = 50;

export type CustomerSupportRealtimeStatus = 'connected' | 'reconnecting' | 'disconnected';

export function useCustomerSupportConversations({
  agentId = null,
  folderCriteria = null,
  canViewCommercialInfo = false,
}: UseCustomerSupportConversationsParams) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingConversations, setIsRefreshingConversations] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<CustomerSupportRealtimeStatus>('reconnecting');
  const [totalCount, setTotalCount] = useState(0);
  const [conversationsError, setConversationsError] = useState('');
  const [counts, setCounts] = useState({ all: 0, mine: 0, unassigned: 0, unread: 0 });

  const selectedConvIdRef = useRef<string | null>(null);
  selectedConvIdRef.current = selectedConversation?.id || null;
  const loadedPagesRef = useRef(1);
  const requestIdRef = useRef(0);
  const pendingRequestRef = useRef<number | null>(null);
  const moreRequestRef = useRef<number | null>(null);
  const realtimeRetryCountRef = useRef(0);
  const reconnectRealtimeRef = useRef<(() => void) | null>(null);
  const queryKey = JSON.stringify([filter, agentId, folderCriteria, canViewCommercialInfo, sortOrder]);
  const activeQueryKeyRef = useRef(queryKey);
  activeQueryKeyRef.current = queryKey;

  const loadConversations = useCallback(async (isSilent = false) => {
    if (isSilent && (moreRequestRef.current !== null || pendingRequestRef.current !== null)) return;
    const requestId = ++requestIdRef.current;
    pendingRequestRef.current = requestId;
    if (!isSilent) {
      moreRequestRef.current = null;
      loadedPagesRef.current = 1;
      setIsLoadingMore(false);
      setIsLoadingConversations(true);
      setConversations([]);
      setTotalCount(0);
    } else {
      setIsRefreshingConversations(true);
    }

    const pagesToLoad = isSilent ? loadedPagesRef.current : 1;
    try {
      const pageResults = await Promise.all(
        Array.from({ length: pagesToLoad }, (_, index) => fetchConversations(supabase, {
          filter: folderCriteria ? 'all' : filter,
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
      if (requestId !== requestIdRef.current || activeQueryKeyRef.current !== queryKey) return;
      setConversations(deduplicated);
      setTotalCount(pageResults[0]?.totalCount || 0);

      if (selectedConvIdRef.current) {
        const found = deduplicated.find((conversation) => conversation.id === selectedConvIdRef.current);
        if (found) setSelectedConversation(found);
      }

      const nextCounts = await fetchConversationCounts(supabase);
      if (requestId === requestIdRef.current && activeQueryKeyRef.current === queryKey) {
        setCounts(nextCounts);
        setConversationsError('');
      }
    } catch (error) {
      if (requestId === requestIdRef.current && activeQueryKeyRef.current === queryKey) {
        setConversationsError(error instanceof Error ? error.message : 'Não foi possível atualizar a Inbox.');
      }
    } finally {
      if (pendingRequestRef.current === requestId) pendingRequestRef.current = null;
      if (requestId === requestIdRef.current) {
        if (!isSilent) setIsLoadingConversations(false);
        setIsRefreshingConversations(false);
      }
    }
  }, [filter, agentId, folderCriteria, canViewCommercialInfo, sortOrder, queryKey]);

  const loadMoreConversations = useCallback(async () => {
    if (moreRequestRef.current !== null || isLoadingConversations || conversations.length >= totalCount) return;
    // Paging takes priority over an older refresh that could replace its rows.
    const requestId = ++requestIdRef.current;
    pendingRequestRef.current = null;
    setIsRefreshingConversations(false);
    moreRequestRef.current = requestId;
    const nextPage = loadedPagesRef.current + 1;
    setIsLoadingMore(true);
    try {
      const result = await fetchConversations(supabase, {
        filter: folderCriteria ? 'all' : filter,
        page: nextPage,
        pageSize: PAGE_SIZE,
        agentId: folderCriteria ? null : agentId,
        criteria: folderCriteria,
        canViewCommercialInfo,
        sortOrder,
      });
      if (requestId !== requestIdRef.current || activeQueryKeyRef.current !== queryKey) return;
      if (result.conversations.length === 0) {
        // An empty offset page carries no window-count row. Reconcile from the
        // loaded pages instead of displaying cached rows with a total of zero.
        moreRequestRef.current = null;
        setIsLoadingMore(false);
        await loadConversations(true);
        return;
      }
      if (result.conversations.length) {
        loadedPagesRef.current = nextPage;
        setConversations((current) => {
          const existing = new Set(current.map((conversation) => conversation.id));
          return [...current, ...result.conversations.filter((conversation) => !existing.has(conversation.id))];
        });
      }
      setTotalCount(result.totalCount);
      setConversationsError('');
    } catch (error) {
      if (requestId === requestIdRef.current && activeQueryKeyRef.current === queryKey) {
        setConversationsError(error instanceof Error ? error.message : 'Não foi possível carregar mais conversas.');
      }
    } finally {
      if (moreRequestRef.current === requestId) {
        moreRequestRef.current = null;
        setIsLoadingMore(false);
      }
    }
  }, [isLoadingConversations, conversations.length, totalCount, folderCriteria, filter, agentId, canViewCommercialInfo, sortOrder, queryKey, loadConversations]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void loadConversations(true);
      }
    }, 30000);
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

  const reconnectRealtime = useCallback(() => reconnectRealtimeRef.current?.(), []);

  useEffect(() => {
    let active = true;
    let channelGeneration = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    realtimeRetryCountRef.current = 0;
    setRealtimeStatus('reconnecting');
    const setupChannel = (manual = false) => {
      if (!active) return;
      if (manual) {
        realtimeRetryCountRef.current = 0;
        setRealtimeStatus('reconnecting');
      } else if (realtimeRetryCountRef.current < 3) {
        setRealtimeStatus('reconnecting');
      }
      const generation = ++channelGeneration;
      const isCurrent = () => active && generation === channelGeneration;
      if (channel) void supabase.removeChannel(channel);
      channel = supabase
        .channel(`whatsapp-conversations-realtime-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
          if (!isCurrent()) return;
          void loadConversations(true);
        })
        .subscribe((status) => {
          if (!isCurrent()) return;
          if (status === 'SUBSCRIBED') {
            realtimeRetryCountRef.current = 0;
            setRealtimeStatus('connected');
          } else if (status === 'CLOSED') {
            realtimeRetryCountRef.current = 3;
            setRealtimeStatus('disconnected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            realtimeRetryCountRef.current += 1;
            setRealtimeStatus(realtimeRetryCountRef.current >= 3 ? 'disconnected' : 'reconnecting');
          }
        });
    };
    reconnectRealtimeRef.current = () => setupChannel(true);
    setupChannel();
    return () => {
      active = false;
      reconnectRealtimeRef.current = null;
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
    isLoadingConversations,
    isLoadingMore,
    conversationsError,
    isRefreshingConversations,
    realtimeStatus,
    reconnectRealtime,
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
