import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  fetchGlobalCustomerSupportContactPage,
  fetchGlobalCustomerSupportMessagePage,
  type CustomerSupportGlobalMessageMatch,
  type CustomerSupportHistoryCursor,
} from '@/pages/utils/customerSupport/customerSupportService';
import { supportGlobalMessageSearchSchema } from '../../../../../../shared-utils/customerSupportFormSchemas';
import type { WhatsAppConversation } from '../types';
import { readSupportSearchCache, writeSupportSearchCache } from './supportSearchCache';

const SEARCH_DEBOUNCE_MS = 350;

interface GlobalSearchState<T> {
  key: string;
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: string;
}

function cursorCacheKey(cursor: CustomerSupportHistoryCursor | null) {
  return cursor ? [cursor.timestamp, cursor.id] : null;
}

function mergeById<T>(existing: T[], incoming: T[], getId: (item: T) => string) {
  const itemsById = new Map<string, T>();
  [...existing, ...incoming].forEach((item) => itemsById.set(getId(item), item));
  return Array.from(itemsById.values());
}

function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.message === 'Busca cancelada.');
}

export function useCustomerSupportGlobalSearch(search: string, userId?: string, isSearchValid = true) {
  const term = search.trim();
  const parsed = supportGlobalMessageSearchSchema.safeParse({ search: term });
  const enabled = Boolean(userId && parsed.success && isSearchValid);
  const key = JSON.stringify([userId || '', term]);
  const activeKeyRef = useRef(key);
  activeKeyRef.current = key;
  const sequenceRef = useRef({ messages: 0, contacts: 0 });
  const cursorRef = useRef<{ messages: CustomerSupportHistoryCursor | null; contacts: CustomerSupportHistoryCursor | null }>({
    messages: null,
    contacts: null,
  });
  const hasMoreRef = useRef({ messages: false, contacts: false });
  const pendingRef = useRef<{ messages: number | null; contacts: number | null }>({
    messages: null,
    contacts: null,
  });
  const controllerRef = useRef<{ messages: AbortController | null; contacts: AbortController | null }>({
    messages: null,
    contacts: null,
  });
  const [messageState, setMessageState] = useState<GlobalSearchState<CustomerSupportGlobalMessageMatch>>({
    key, items: [], isLoading: enabled, hasMore: false, error: '',
  });
  const [contactState, setContactState] = useState<GlobalSearchState<WhatsAppConversation>>({
    key, items: [], isLoading: enabled, hasMore: false, error: '',
  });

  const loadMessagePage = useCallback(async (reset = false) => {
    if (!enabled || !userId || (!reset && (pendingRef.current.messages !== null || !hasMoreRef.current.messages))) return;
    controllerRef.current.messages?.abort();
    const controller = new AbortController();
    controllerRef.current.messages = controller;
    const sequence = ++sequenceRef.current.messages;
    const cursor = reset ? null : cursorRef.current.messages;
    pendingRef.current.messages = sequence;
    if (reset) {
      cursorRef.current.messages = null;
      hasMoreRef.current.messages = true;
    }
    setMessageState((previous) => ({
      key,
      items: reset || previous.key !== key ? [] : previous.items,
      isLoading: true,
      hasMore: reset ? false : previous.hasMore,
      error: '',
    }));
    const cacheKey = JSON.stringify([userId, 'messages', term, cursorCacheKey(cursor)]);
    try {
      const cached = readSupportSearchCache<CustomerSupportGlobalMessageMatch>(cacheKey);
      const page = cached || await fetchGlobalCustomerSupportMessagePage(supabase, term, cursor, 5, controller.signal);
      if (!cached) writeSupportSearchCache(cacheKey, page);
      if (controller.signal.aborted || activeKeyRef.current !== key || sequence !== sequenceRef.current.messages) return;
      cursorRef.current.messages = page.nextCursor;
      hasMoreRef.current.messages = page.hasMore;
      setMessageState((previous) => ({
        key,
        items: mergeById(reset || previous.key !== key ? [] : previous.items, page.items, (item) => item.message.id),
        isLoading: false,
        hasMore: page.hasMore,
        error: '',
      }));
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)
        && activeKeyRef.current === key && sequence === sequenceRef.current.messages) {
        setMessageState((previous) => ({
          ...previous,
          key,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Não foi possível pesquisar as mensagens. Tente novamente.',
        }));
      }
    } finally {
      if (pendingRef.current.messages === sequence) pendingRef.current.messages = null;
    }
  }, [enabled, key, term, userId]);

  const loadContactPage = useCallback(async (reset = false) => {
    if (!enabled || !userId || (!reset && (pendingRef.current.contacts !== null || !hasMoreRef.current.contacts))) return;
    controllerRef.current.contacts?.abort();
    const controller = new AbortController();
    controllerRef.current.contacts = controller;
    const sequence = ++sequenceRef.current.contacts;
    const cursor = reset ? null : cursorRef.current.contacts;
    pendingRef.current.contacts = sequence;
    if (reset) {
      cursorRef.current.contacts = null;
      hasMoreRef.current.contacts = true;
    }
    setContactState((previous) => ({
      key,
      items: reset || previous.key !== key ? [] : previous.items,
      isLoading: true,
      hasMore: reset ? false : previous.hasMore,
      error: '',
    }));
    const cacheKey = JSON.stringify([userId, 'contacts', term, cursorCacheKey(cursor)]);
    try {
      const cached = readSupportSearchCache<WhatsAppConversation>(cacheKey);
      const page = cached || await fetchGlobalCustomerSupportContactPage(supabase, term, cursor, 5, controller.signal);
      if (!cached) writeSupportSearchCache(cacheKey, page);
      if (controller.signal.aborted || activeKeyRef.current !== key || sequence !== sequenceRef.current.contacts) return;
      cursorRef.current.contacts = page.nextCursor;
      hasMoreRef.current.contacts = page.hasMore;
      setContactState((previous) => ({
        key,
        items: mergeById(reset || previous.key !== key ? [] : previous.items, page.items, (item) => item.id),
        isLoading: false,
        hasMore: page.hasMore,
        error: '',
      }));
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)
        && activeKeyRef.current === key && sequence === sequenceRef.current.contacts) {
        setContactState((previous) => ({
          ...previous,
          key,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Não foi possível pesquisar conversas por contato. Tente novamente.',
        }));
      }
    } finally {
      if (pendingRef.current.contacts === sequence) pendingRef.current.contacts = null;
    }
  }, [enabled, key, term, userId]);

  useEffect(() => {
    controllerRef.current.messages?.abort();
    controllerRef.current.contacts?.abort();
    sequenceRef.current.messages += 1;
    sequenceRef.current.contacts += 1;
    pendingRef.current.messages = null;
    pendingRef.current.contacts = null;
    cursorRef.current = { messages: null, contacts: null };
    hasMoreRef.current = { messages: false, contacts: false };
    setMessageState({ key, items: [], isLoading: enabled, hasMore: false, error: '' });
    setContactState({ key, items: [], isLoading: enabled, hasMore: false, error: '' });
    if (!enabled) return;

    const timer = setTimeout(() => {
      void loadMessagePage(true);
      void loadContactPage(true);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controllerRef.current.messages?.abort();
      controllerRef.current.contacts?.abort();
    };
  }, [enabled, key, loadContactPage, loadMessagePage]);

  const visibleMessages = messageState.key === key ? messageState : {
    key, items: [], isLoading: enabled, hasMore: false, error: '',
  };
  const visibleContacts = contactState.key === key ? contactState : {
    key, items: [], isLoading: enabled, hasMore: false, error: '',
  };

  return {
    messages: visibleMessages,
    contacts: visibleContacts,
    loadMoreMessages: () => loadMessagePage(),
    loadMoreContacts: () => loadContactPage(),
  };
}
