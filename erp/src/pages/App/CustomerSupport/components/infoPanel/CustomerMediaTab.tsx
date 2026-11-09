import React from 'react';
import type { WhatsAppMessage } from '../../types';
import { CustomerMediaItem, useCustomerMediaPagination } from './media';

interface CustomerMediaTabProps {
  conversationId: string;
  onJumpToMessage: (message: WhatsAppMessage) => void;
}

export const CustomerMediaTab: React.FC<CustomerMediaTabProps> = ({
  conversationId,
  onJumpToMessage,
}) => {
  const {
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
  } = useCustomerMediaPagination(conversationId);

  return (
    <div className="space-y-4 animate-fade-in">
      <form onSubmit={submitSearch} className="flex gap-2">
        <label className="sr-only" htmlFor="customer-support-attachment-search">
          Buscar anexos
        </label>
        <input
          id="customer-support-attachment-search"
          type="search"
          {...register('search')}
          placeholder="Buscar em nomes e legendas"
          className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
        >
          Buscar
        </button>
      </form>
      {errors.search && <p role="alert" className="text-[11px] text-red-600">{errors.search.message}</p>}
      {error && (
        <p role="alert" className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-xs text-amber-800 dark:text-amber-300">
          {error}
        </p>
      )}
      <p className="text-[10px] text-slate-400">Anexos carregados: {attachments.length}</p>

      {imageMessages.length > 0 && (
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Fotos carregadas ({imageMessages.length})
          </span>
          <div className="grid grid-cols-3 gap-2">
            {imageMessages.map((message) => (
              <CustomerMediaItem
                key={message.id}
                message={message}
                onJumpToMessage={onJumpToMessage}
              />
            ))}
          </div>
        </div>
      )}

      {otherMessages.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Outros anexos carregados ({otherMessages.length})
          </span>
          <div className="space-y-2">
            {otherMessages.map((message) => (
              <CustomerMediaItem
                key={message.id}
                message={message}
                onJumpToMessage={onJumpToMessage}
              />
            ))}
          </div>
        </div>
      )}

      {isLoading && attachments.length === 0 && (
        <p className="py-6 text-center text-slate-400 text-xs">Carregando anexos…</p>
      )}
      {!isLoading && attachments.length === 0 && !error && (
        <p className="text-slate-400 text-xs text-center py-4">
          {searchText ? 'Nenhum anexo encontrado para esta busca.' : 'Nenhum anexo compartilhado.'}
        </p>
      )}
      {(hasMore || error) && (
        <button
          type="button"
          disabled={isLoading}
          onClick={error && attachments.length === 0 ? retryFirstPage : loadMore}
          className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 disabled:opacity-50"
        >
          {isLoading ? 'Carregando…' : error ? 'Tentar novamente' : 'Carregar mais anexos'}
        </button>
      )}
    </div>
  );
};
