import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supportAttachmentSearchSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import {
  fetchConversationAttachmentPage,
  type CustomerSupportHistoryCursor,
} from '@/pages/utils/customerSupport/customerSupportService';
import { useCustomerSupportMedia } from '../../hooks/useCustomerSupportMedia';
import { WhatsAppMessage } from '../../types';
import { MediaLoadStatus } from '../chat/bubble/MediaLoadStatus';
import { supabase } from '@/pages/utils/supabaseConfig';

type AttachmentSearch = z.infer<typeof supportAttachmentSearchSchema>;
const ATTACHMENT_LABELS: Partial<Record<WhatsAppMessage['messageType'], string>> = {
  image: 'Foto', document: 'Documento', audio: 'Áudio', video: 'Vídeo', sticker: 'Figurinha', template: 'Mídia de template',
};

interface CustomerMediaTabProps {
  conversationId: string;
  onJumpToMessage: (message: WhatsAppMessage) => void;
}

function CustomerMediaItem({
  message,
  onJumpToMessage,
}: {
  message: WhatsAppMessage;
  onJumpToMessage: (message: WhatsAppMessage) => void;
}) {
  const { mediaUrl, isLoadingMedia, mediaError, retryMedia } = useCustomerSupportMedia(message.mediaId);
  const isImage = message.messageType === 'image'
    || (message.messageType === 'template' && message.rawPayload?.template_preview?.header?.type === 'image');
  const label = message.mediaFilename || ATTACHMENT_LABELS[message.messageType] || 'Anexo';

  return (
    <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs p-2">
      <MediaLoadStatus loading={isLoadingMedia} error={mediaError} onRetry={retryMedia} />
      {mediaUrl ? (
        <a href={mediaUrl} download={isImage ? undefined : label} target="_blank" rel="noopener noreferrer"
          className="block text-emerald-600 dark:text-emerald-400 hover:opacity-90"
          aria-label={isImage ? 'Abrir foto compartilhada' : `Abrir ${label}`}>
          {isImage
            ? <img src={mediaUrl} alt={label} loading="lazy" className="w-full aspect-square object-cover rounded-lg" />
            : <span className="break-words">{label} — Abrir anexo</span>}
        </a>
      ) : !isLoadingMedia && !mediaError ? (
        <p className="text-slate-500">Arquivo sem identificador de mídia disponível.</p>
      ) : null}
      <button type="button" onClick={() => onJumpToMessage(message)}
        className="mt-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
        Ver na conversa
      </button>
    </div>
  );
}

export const CustomerMediaTab: React.FC<CustomerMediaTabProps> = ({ conversationId, onJumpToMessage }) => {
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

  const loadPage = useCallback(async (
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
        return Array.from(byId.values()).sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)
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
  }, [conversationId]);

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
    return () => { requestGenerationRef.current += 1; };
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

  const imageMessages = attachments.filter((message) => message.messageType === 'image'
    || (message.messageType === 'template' && message.rawPayload?.template_preview?.header?.type === 'image'));
  const otherMessages = attachments.filter((message) => !imageMessages.some((image) => image.id === message.id));

  return (
    <div className="space-y-4 animate-fade-in">
      <form onSubmit={submitSearch} className="flex gap-2">
        <label className="sr-only" htmlFor="customer-support-attachment-search">Buscar anexos</label>
        <input
          id="customer-support-attachment-search"
          type="search"
          {...register('search')}
          placeholder="Buscar em nomes e legendas"
          className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button type="submit" disabled={isLoading}
          className="px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">
          Buscar
        </button>
      </form>
      {errors.search && <p role="alert" className="text-[11px] text-red-600">{errors.search.message}</p>}
      {error && <p role="alert" className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-xs text-amber-800 dark:text-amber-300">{error}</p>}
      <p className="text-[10px] text-slate-400">Anexos carregados: {attachments.length}</p>

      {imageMessages.length > 0 && (
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Fotos carregadas ({imageMessages.length})</span>
          <div className="grid grid-cols-3 gap-2">
            {imageMessages.map((message) => <CustomerMediaItem key={message.id} message={message} onJumpToMessage={onJumpToMessage} />)}
          </div>
        </div>
      )}
      {otherMessages.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Outros anexos carregados ({otherMessages.length})</span>
          <div className="space-y-2">
            {otherMessages.map((message) => <CustomerMediaItem key={message.id} message={message} onJumpToMessage={onJumpToMessage} />)}
          </div>
        </div>
      )}
      {isLoading && attachments.length === 0 && <p className="py-6 text-center text-slate-400 text-xs">Carregando anexos…</p>}
      {!isLoading && attachments.length === 0 && !error && (
        <p className="text-slate-400 text-xs text-center py-4">{searchText ? 'Nenhum anexo encontrado para esta busca.' : 'Nenhum anexo compartilhado.'}</p>
      )}
      {(hasMore || error) && (
        <button type="button" disabled={isLoading} onClick={error && attachments.length === 0
          ? () => void loadPage(null, searchText, requestGenerationRef.current, true)
          : loadMore}
          className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 disabled:opacity-50">
          {isLoading ? 'Carregando…' : error ? 'Tentar novamente' : 'Carregar mais anexos'}
        </button>
      )}
    </div>
  );
};
