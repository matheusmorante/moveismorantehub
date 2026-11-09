import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import type { WhatsAppMessage } from '../../../types';

interface UseTimelineScrollParams {
  conversationId: string;
  timelineMessages: WhatsAppMessage[];
  isSearching: boolean;
  hasOlderMessages: boolean;
  onLoadOlderMessages?: () => Promise<number>;
  jumpToMessageId?: string | null;
  onJumpComplete?: () => void;
  filteredMessagesLength: number;
}

export function useTimelineScroll({
  conversationId,
  timelineMessages,
  isSearching,
  hasOlderMessages,
  onLoadOlderMessages,
  jumpToMessageId,
  onJumpComplete,
  filteredMessagesLength,
}: UseTimelineScrollParams) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const loadingOlderRef = useRef(false);
  const jumpCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preserveScroll, setPreserveScroll] = useState<{ height: number; top: number } | null>(null);

  // Mantém a posição ao anexar mensagens antigas; novas mensagens seguem para o final.
  useLayoutEffect(() => {
    const conversationChanged = previousConversationIdRef.current !== conversationId;
    const latestId = timelineMessages[timelineMessages.length - 1]?.id || null;
    const previousLatestId = previousLastMessageIdRef.current;
    const latestChanged = previousLatestId !== latestId;
    const firstMessagesLoaded = previousLatestId === null && latestId !== null;
    previousConversationIdRef.current = conversationId;
    previousLastMessageIdRef.current = latestId;

    if (preserveScroll && timelineRef.current) {
      const container = timelineRef.current;
      container.scrollTop = preserveScroll.top + container.scrollHeight - preserveScroll.height;
      setPreserveScroll(null);
    } else if (conversationChanged || latestChanged) {
      const container = timelineRef.current;
      if (container) {
        if (conversationChanged || firstMessagesLoaded) container.scrollTop = container.scrollHeight;
        else container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [timelineMessages, conversationId, preserveScroll]);

  const handleTimelineScroll = async () => {
    const container = timelineRef.current;
    if (isSearching || !container || container.scrollTop > 24 || !hasOlderMessages || !onLoadOlderMessages || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    const currentPosition = { height: container.scrollHeight, top: container.scrollTop };
    setPreserveScroll(currentPosition);
    try {
      const loaded = await onLoadOlderMessages();
      if (!loaded) setPreserveScroll(null);
      requestAnimationFrame(() => {
        if (timelineRef.current && loaded) {
          timelineRef.current.scrollTop = currentPosition.top + timelineRef.current.scrollHeight - currentPosition.height;
          setPreserveScroll(null);
        }
      });
    } finally {
      loadingOlderRef.current = false;
    }
  };

  useEffect(() => {
    if (!jumpToMessageId || !timelineRef.current) return;
    const target = Array.from(timelineRef.current.querySelectorAll<HTMLElement>('[data-message-id]'))
      .find((element) => element.dataset.messageId === jumpToMessageId);
    if (!target) return;
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    onJumpComplete?.();
  }, [jumpToMessageId, filteredMessagesLength, onJumpComplete]);

  useEffect(() => () => {
    if (jumpCompleteTimerRef.current) clearTimeout(jumpCompleteTimerRef.current);
  }, []);

  return {
    timelineRef,
    handleTimelineScroll,
  };
}
