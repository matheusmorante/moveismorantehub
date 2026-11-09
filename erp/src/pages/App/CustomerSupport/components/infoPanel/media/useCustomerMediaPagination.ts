import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supportAttachmentSearchSchema } from '../../../../../../../../shared-utils/customerSupportFormSchemas';
import {
  fetchConversationAttachmentPage,
  type CustomerSupportHistoryCursor,
} from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import type { WhatsAppMessage } from '../../../types';

export type AttachmentSearch = z.infer<typeof supportAttachmentSearchSchema>;

export function useCustomerMediaPagination(conversationId: string) {
  const [attachments, setAttachments] = useState<WhatsAppMessage[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const cursorRef = useRef<CustomerSupportHistoryCursor | null>(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const requestGenerationRef = useRef(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AttachmentSearch>({
    resolver: zodResolver(supportAttachmentSearchSchema),
    defaultValues: { search: '' },
  });

  const loadPage = useCallback(
    async (
      cursor: CustomerSupportHistoryCursor | null,
      search: string,
      generation: number,
      replace: boolean
    ) => {
      if (!conversationId || (!replace && (loadingRef.current || !hasMoreRef.current))) return;
      loadingRef.current = true;
      setIsLoading(true);
      try {
        const page = await fetchConversationAttachmentPage(supabase, conversationId, cursor, search);
        if (generation !== requestGenerationRef.current) return;
        setAttachments((current) => {
          const byId = new Map((replace ? [] : current).map((message) => [message.id, message]));
          page.messages.forEach((message) => byId.set(message.id, message));
          return Array.from(byId.values()).sort(
            (a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)
          );
        });
        cursorRef.current = page.nextCursor;
        hasMoreRef.current = page.hasMore;
        setHasMore(page.hasMore);
        setError('');
      } catch (loadError) {
        if (generation === requestGenerationRef.current) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os anexos.');
        }
      } finally {
        if (generation === requestGenerationRef.current) {
          loadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [conversationId]
  );

  useEffect(() => {
    const generation = ++requestGenerationRef.current;
    cursorRef.current = null;
    hasMoreRef.current = true;
    loadingRef.current = false;
    setAttachments([]);
    setSearchText('');
    setHasMore(true);
    setError('');
    void loadPage(null, '', generation, true);
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [conversationId, loadPage]);

  const submitSearch = handleSubmit((data) => {
    const generation = ++requestGenerationRef.current;
    cursorRef.current = null;
    hasMoreRef.current = true;
    setAttachments([]);
    setHasMore(true);
    setError('');
    setSearchText(data.search);
    void loadPage(null, data.search, generation, true);
  });

  const loadMore = () => {
    if (!hasMoreRef.current || loadingRef.current) return;
    void loadPage(cursorRef.current, searchText, requestGenerationRef.current, false);
  };

  const retryFirstPage = () => {
    void loadPage(null, searchText, requestGenerationRef.current, true);
  };

  const imageMessages = attachments.filter(
    (message) =>
      message.messageType === 'image' ||
      (message.messageType === 'template' &&
        message.rawPayload?.template_preview?.header?.type === 'image')
  );
  const otherMessages = attachments.filter(
    (message) => !imageMessages.some((image) => image.id === message.id)
  );

  return {
    attachments,
    imageMessages,
    otherMessages,
    searchText,
    isLoading,
    hasMore,
    error,
    errors,
    register,
    submitSearch,
    loadMore,
    retryFirstPage,
  };
}
