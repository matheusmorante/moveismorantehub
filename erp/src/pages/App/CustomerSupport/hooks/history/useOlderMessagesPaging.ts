import { useState, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppMessage } from '../../types';
import { fetchPreviousConversationMessages } from '@/pages/utils/customerSupport/customerSupportService';

const OLDER_MESSAGE_PAGE_SIZE = 50;

interface UseOlderMessagesPagingParams {
  supabase: SupabaseClient;
  activeConvIdRef: React.MutableRefObject<string | null>;
  generationRef: React.MutableRefObject<number>;
  historyConversationIdRef: React.MutableRefObject<string | null>;
  historyCursorRef: React.MutableRefObject<{ timestamp: string; id: string } | null>;
  setMessages: React.Dispatch<React.SetStateAction<WhatsAppMessage[]>>;
  setMessagesError: React.Dispatch<React.SetStateAction<string>>;
}

export function useOlderMessagesPaging({
  supabase,
  activeConvIdRef,
  generationRef,
  historyConversationIdRef,
  historyCursorRef,
  setMessages,
  setMessagesError,
}: UseOlderMessagesPagingParams) {
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const loadingOlderRef = useRef<number | null>(null);

  const loadOlderMessages = useCallback(async () => {
    const convId = activeConvIdRef.current;
    const generation = generationRef.current;
    if (
      !convId ||
      historyConversationIdRef.current !== convId ||
      loadingOlderRef.current === generation ||
      !hasOlderMessages
    ) {
      return 0;
    }
    const oldest = historyCursorRef.current;
    if (!oldest) return 0;
    loadingOlderRef.current = generation;
    setIsLoadingOlderMessages(true);
    try {
      const older = await fetchPreviousConversationMessages(
        supabase,
        convId,
        { timestamp: oldest.timestamp, id: oldest.id },
        OLDER_MESSAGE_PAGE_SIZE
      );
      if (generation !== generationRef.current) return 0;
      setHasOlderMessages(older.length === OLDER_MESSAGE_PAGE_SIZE);
      setMessagesError('');
      if (older.length) {
        historyCursorRef.current = { timestamp: older[0].timestamp, id: older[0].id };
        setMessages((current) => {
          const existing = new Set(current.map((message) => message.id));
          return [...older.filter((message) => !existing.has(message.id)), ...current].sort(
            (a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id)
          );
        });
      }
      return older.length;
    } catch (error) {
      if (generation === generationRef.current) {
        setMessagesError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as mensagens anteriores.'
        );
      }
      return 0;
    } finally {
      if (loadingOlderRef.current === generation) {
        loadingOlderRef.current = null;
        setIsLoadingOlderMessages(false);
      }
    }
  }, [
    activeConvIdRef,
    generationRef,
    hasOlderMessages,
    historyConversationIdRef,
    historyCursorRef,
    setMessages,
    setMessagesError,
    supabase,
  ]);

  return {
    isLoadingOlderMessages,
    setIsLoadingOlderMessages,
    hasOlderMessages,
    setHasOlderMessages,
    loadingOlderRef,
    loadOlderMessages,
  };
}
