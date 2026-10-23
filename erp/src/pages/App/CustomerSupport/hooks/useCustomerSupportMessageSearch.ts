import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  fetchConversationMessageSearchPage,
  type CustomerSupportHistoryCursor,
} from '@/pages/utils/customerSupport/customerSupportService';
import type { WhatsAppMessage } from '../types';

interface MessageSearchState {
  key: string;
  messages: WhatsAppMessage[];
  isLoading: boolean;
  hasMore: boolean;
  error: string;
}

export function useCustomerSupportMessageSearch(conversationId: string, search: string, revision = 0) {
  const term = search.trim();
  const enabled = Boolean(conversationId && term);
  const key = JSON.stringify([conversationId, term, revision]);
  const activeKeyRef = useRef(key);
  activeKeyRef.current = key;
  const mountedRef = useRef(false);
  const sequenceRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const cursorRef = useRef<CustomerSupportHistoryCursor | null>(null);
  const hasMoreRef = useRef(true);
  const [state, setState] = useState<MessageSearchState>({ key, messages: [], isLoading: enabled, hasMore: false, error: '' });

  const loadPage = useCallback(async (reset = false) => {
    if (!enabled || (!reset && (pendingRef.current !== null || !hasMoreRef.current))) return;
    const sequence = ++sequenceRef.current;
    const current = () => mountedRef.current && activeKeyRef.current === key && sequence === sequenceRef.current;
    pendingRef.current = sequence;
    if (reset) {
      cursorRef.current = null;
      hasMoreRef.current = true;
    }
    setState((previous) => ({
      key, messages: reset || previous.key !== key ? [] : previous.messages,
      isLoading: true, hasMore: hasMoreRef.current, error: '',
    }));
    try {
      const page = await fetchConversationMessageSearchPage(supabase, conversationId, cursorRef.current, term);
      if (!current()) return;
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
      setState((previous) => {
        const byId = new Map((reset || previous.key !== key ? [] : previous.messages).map((message) => [message.id, message]));
        page.messages.forEach((message) => byId.set(message.id, message));
        return {
          key, messages: Array.from(byId.values()).sort((a, b) =>
            a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
          ), isLoading: false, hasMore: page.hasMore, error: '',
        };
      });
    } catch (error) {
      if (current()) setState((previous) => ({
        ...previous, isLoading: false,
        error: error instanceof Error ? error.message : 'Não foi possível pesquisar as mensagens. Tente novamente.',
      }));
    } finally {
      if (pendingRef.current === sequence) pendingRef.current = null;
    }
  }, [conversationId, enabled, key, term]);

  useEffect(() => {
    mountedRef.current = true;
    pendingRef.current = null;
    cursorRef.current = null;
    hasMoreRef.current = true;
    setState({ key, messages: [], isLoading: enabled, hasMore: false, error: '' });
    if (enabled) void loadPage(true);
    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
    };
  }, [enabled, key, loadPage]);

  const visibleState = state.key === key ? state
    : { key, messages: [], isLoading: enabled, hasMore: false, error: '' };
  return { ...visibleState, loadMore: () => loadPage() };
}
