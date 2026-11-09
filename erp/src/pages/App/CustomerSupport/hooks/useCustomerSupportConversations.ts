import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { WhatsAppConversation, ConversationFilter, CustomerSupportFolderCriteria } from '../types';
import {
  fetchConversationCounts,
  fetchConversations,
} from '@/pages/utils/customerSupport/customerSupportService';
import { SortOrder } from '../components/ConversationSidebar';
import { useConversationsRealtime, useConversationsPolling } from './conversations';

interface UseCustomerSupportConversationsParams {
  agentId?: string | null;
  folderCriteria?: CustomerSupportFolderCriteria | null;
  canViewCommercialInfo?: boolean;
}

const PAGE_SIZE = 50;

export function useCustomerSupportConversations({
  agentId = null,
  folderCriteria = null,
  canViewCommercialInfo = false,
}: UseCustomerSupportConversationsParams) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const sortOrder: SortOrder = 'newest';
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingConversations, setIsRefreshingConversations] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [conversationsError, setConversationsError] = useState('');
  const [counts, setCounts] = useState({ all: 0, mine: 0, unassigned: 0, unread: 0 });

  const selectedConvIdRef = useRef<string | null>(null);
  selectedConvIdRef.current = selectedConversation?.id || null;
  const loadedPagesRef = useRef(1);
  const requestIdRef = useRef(0);
  const pendingRequestRef = useRef<number | null>(null);
  const moreRequestRef = useRef<number | null>(null);
  const queryKey = JSON.stringify([filter, agentId, folderCriteria, canViewCommercialInfo, sortOrder]);
  const activeQueryKeyRef = useRef(queryKey);
  activeQueryKeyRef.current = queryKey;

  const loadConversations = useCallback(
    async (isSilent = false) => {
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
          Array.from({ length: pagesToLoad }, (_, index) =>
            fetchConversations(supabase, {
              filter: folderCriteria ? 'all' : filter,
              page: index + 1,
              pageSize: PAGE_SIZE,
              agentId: folderCriteria ? null : agentId,
              criteria: folderCriteria,
              canViewCommercialInfo,
              sortOrder,
            })
          )
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
    },
    [filter, agentId, folderCriteria, canViewCommercialInfo, sortOrder, queryKey]
  );

  const loadMoreConversations = useCallback(async () => {
    if (moreRequestRef.current !== null || isLoadingConversations || conversations.length >= totalCount) return;
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
  }, [
    isLoadingConversations,
    conversations.length,
    totalCount,
    folderCriteria,
    filter,
    agentId,
    canViewCommercialInfo,
    sortOrder,
    queryKey,
    loadConversations,
  ]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const handleSilentReload = useCallback(() => {
    void loadConversations(true);
  }, [loadConversations]);

  useConversationsPolling(handleSilentReload);
  useConversationsRealtime(handleSilentReload);

  return {
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    filter,
    setFilter,
    sortOrder,
    isLoadingConversations,
    isLoadingMore,
    conversationsError,
    isRefreshingConversations,
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
