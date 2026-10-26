import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  fetchConversationMessageSearchPage,
  type CustomerSupportHistoryCursor,
} from '@/pages/utils/customerSupport/customerSupportService';
import { supportMessageSearchSchema } from '../../../../../../shared-utils/customerSupportFormSchemas';
import type { WhatsAppMessage } from '../types';
import { readSupportSearchCache, writeSupportSearchCache } from './supportSearchCache';

const SEARCH_DEBOUNCE_MS = 350;

interface MessageSearchState {
  key: string;
  messages: WhatsAppMessage[];
  isLoading: boolean;
  hasMore: boolean;
  error: string;
}

export function useCustomerSupportMessageSearch(
  conversationId: string,
  search: string,
  revision = 0,
  userId?: string
) {
  const term = search.trim();
  const parsed = supportMessageSearchSchema.safeParse({ search: term });
  const enabled = Boolean(conversationId && term && parsed.success);
  const key = JSON.stringify([userId || '', conversationId, term, revision]);
  const activeKeyRef = useRef(key);
  activeKeyRef.current = key;
  const sequenceRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const cursorRef = useRef<CustomerSupportHistoryCursor | null>(null);
  const hasMoreRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<MessageSearchState>({
    key, messages: [], isLoading: enabled, hasMore: false, error: '',
  });

  const loadPage = useCallback(async (reset = false) => {
    if (!enabled || (!reset && (pendingRef.current !== null || !hasMoreRef.current))) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const sequence = ++sequenceRef.current;
    const cursor = reset ? null : cursorRef.current;
    const current = () => activeKeyRef.current === key && sequence === sequenceRef.current;
    pendingRef.current = sequence;
    if (reset) {
      cursorRef.current = null;
      hasMoreRef.current = true;
    }
    setState((previous) => ({
      key,
      messages: reset || previous.key !== key ? [] : previous.messages,
      isLoading: true,
      hasMore: reset ? false : previous.hasMore,
      error: '',
    }));
    const cacheKey = JSON.stringify([
      userId || '',
      'conversation',
      conversationId,
      term,
      cursor ? [cursor.timestamp, cursor.id] : null,
    ]);
    try {
      const cached = readSupportSearchCache<WhatsAppMessage>(cacheKey);
      const cachedPage = cached
        ? { messages: cached.items, hasMore: cached.hasMore, nextCursor: cached.nextCursor }
        : null;
      const page = cachedPage || await fetchConversationMessageSearchPage(
        supabase, conversationId, cursor, term, 5, controller.signal
      );
      if (!cachedPage) {
        writeSupportSearchCache(cacheKey, {
          items: page.messages,
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
        });
      }
      if (controller.signal.aborted || !current()) return;
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.hasMore;
      setState((previous) => {
        const byId = new Map((reset || previous.key !== key ? [] : previous.messages).map((message) => [message.id, message]));
        page.messages.forEach((message) => byId.set(message.id, message));
        return {
          key,
          messages: Array.from(byId.values()).sort((a, b) =>
            a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
          ),
          isLoading: false,
          hasMore: page.hasMore,
          error: '',
        };
      });
    } catch (error) {
      if (!controller.signal.aborted && current()) setState((previous) => ({
        ...previous,
        key,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Não foi possível pesquisar as mensagens. Tente novamente.',
      }));
    } finally {
      if (pendingRef.current === sequence) pendingRef.current = null;
    }
  }, [conversationId, enabled, key, term, userId]);

  useEffect(() => {
    controllerRef.current?.abort();
    sequenceRef.current += 1;
    pendingRef.current = null;
    cursorRef.current = null;
    hasMoreRef.current = true;
    setState({ key, messages: [], isLoading: enabled, hasMore: false, error: '' });
    if (!enabled) return;

    const timer = setTimeout(() => void loadPage(true), SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controllerRef.current?.abort();
      sequenceRef.current += 1;
    };
  }, [enabled, key, loadPage]);

  const visibleState = state.key === key ? state
    : { key, messages: [], isLoading: enabled, hasMore: false, error: '' };
  return { ...visibleState, loadMore: () => loadPage() };
}
