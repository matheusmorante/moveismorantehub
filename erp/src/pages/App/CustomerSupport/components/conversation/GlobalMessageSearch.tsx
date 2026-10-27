import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportGlobalMessageSearchSchema, type SupportGlobalMessageSearchInput } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import { useCustomerSupportGlobalSearch } from '../../hooks/useCustomerSupportGlobalSearch';

interface GlobalMessageSearchProps {
  isVisible: boolean;
  userId?: string;
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  onJumpToMessage?: (message: WhatsAppMessage) => void;
}

function formatSearchResultDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function conversationName(conversation: WhatsAppConversation) {
  return conversation.contactName?.trim() || conversation.contactPhone || 'Contato sem nome';
}

export const GlobalMessageSearch: React.FC<GlobalMessageSearchProps> = ({
  isVisible,
  userId,
  onSelectConversation,
  onJumpToMessage,
}) => {
  const {
    register,
    control,
    setFocus,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SupportGlobalMessageSearchInput>({
    resolver: zodResolver(supportGlobalMessageSearchSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { search: '' },
  });
  const search = useWatch({ control, name: 'search' }) || '';
  const results = useCustomerSupportGlobalSearch(search, userId, isValid);
  const trimmedSearch = search.trim();
  const minimumLengthError = errors.search?.message;

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => setFocus('search'), 0);
    return () => clearTimeout(timer);
  }, [isVisible, setFocus]);

  const handleSearchSubmit = () => undefined;
  const showResults = trimmedSearch.length >= 3;

  return (
    <div className={isVisible ? 'shrink-0 flex flex-col bg-white dark:bg-slate-900' : 'hidden'}>
      <form onSubmit={handleSubmit(handleSearchSubmit)} className="shrink-0 border-b border-slate-200/80 p-3 dark:border-slate-800">
        <label htmlFor="customer-support-global-search" className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-200">
          Pesquisar mensagens
        </label>
        <div className="relative flex items-center">
          <i className="bi bi-chat-square-text absolute left-3 text-sm text-slate-400" aria-hidden="true" />
          <input
            id="customer-support-global-search"
            type="search"
            maxLength={100}
            autoComplete="off"
            placeholder="Mensagem, nome ou telefone"
            aria-describedby="customer-support-global-search-hint"
            aria-invalid={Boolean(minimumLengthError && trimmedSearch.length > 0)}
            {...register('search')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
          />
        </div>
        <p id="customer-support-global-search-hint" className="mt-1.5 text-[11px] text-slate-400">
          {minimumLengthError && trimmedSearch.length > 0
            ? minimumLengthError
            : trimmedSearch.length > 0 && trimmedSearch.length < 3
              ? 'Digite mais ' + (3 - trimmedSearch.length) + ' caractere(s) para pesquisar.'
              : 'Mínimo de 3 caracteres. Resultados separados entre mensagens e contatos.'}
        </p>
      </form>

      {showResults && (
        <div role="region" aria-label="Resultados da busca global" className="max-h-56 shrink-0 overflow-y-auto">
          <div className="space-y-4 p-2">
            <section aria-labelledby="global-message-results-heading">
              <div className="flex items-center justify-between px-2 py-1.5">
                <h3 id="global-message-results-heading" className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Mensagens
                </h3>
                {results.messages.items.length > 0 && (
                  <span className="text-[10px] text-slate-400">{results.messages.items.length} resultado(s)</span>
                )}
              </div>
              {results.messages.items.map(({ message, conversation }) => {
                const excerpt = message.textContent?.trim()
                  || message.mediaCaption?.trim()
                  || message.mediaFilename?.trim()
                  || 'Conteúdo de mídia';
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => {
                      onSelectConversation(conversation);
                      onJumpToMessage?.(message);
                    }}
                    className="mb-1 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-slate-800"
                  >
                    <i className="bi bi-chat-left-text mt-0.5 text-xs text-blue-500" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{conversationName(conversation)}</span>
                        <time className="shrink-0 text-[10px] text-slate-400">{formatSearchResultDate(message.timestamp)}</time>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">{excerpt}</span>
                    </span>
                  </button>
                );
              })}
              {results.messages.isLoading && (
                <p role="status" className="px-3 py-2 text-[11px] text-slate-400">Pesquisando mensagens…</p>
              )}
              {!results.messages.isLoading && !results.messages.error && results.messages.items.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-slate-400">Nenhuma mensagem encontrada.</p>
              )}
              {results.messages.error && (
                <div role="alert" className="px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                  <p>{results.messages.error}</p>
                  <button type="button" onClick={() => void results.loadMoreMessages()} className="mt-1 font-semibold underline">
                    Tentar novamente
                  </button>
                </div>
              )}
              {results.messages.hasMore && (
                <button type="button" disabled={results.messages.isLoading} onClick={() => void results.loadMoreMessages()}
                  className="w-full rounded-md px-3 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-slate-800">
                  {results.messages.isLoading ? 'Carregando…' : 'Ver mais 5 mensagens'}
                </button>
              )}
            </section>

            <section aria-labelledby="global-contact-results-heading">
              <div className="flex items-center justify-between px-2 py-1.5">
                <h3 id="global-contact-results-heading" className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Conversas por contato
                </h3>
                {results.contacts.items.length > 0 && (
                  <span className="text-[10px] text-slate-400">{results.contacts.items.length} resultado(s)</span>
                )}
              </div>
              {results.contacts.items.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation)}
                  className="mb-1 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-slate-800"
                >
                  <i className="bi bi-person-circle mt-0.5 text-xs text-slate-400" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{conversationName(conversation)}</span>
                      <time className="shrink-0 text-[10px] text-slate-400">{formatSearchResultDate(conversation.lastMessageAt)}</time>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {conversation.contactPhone || conversation.contactWaId || 'Contato'}
                    </span>
                  </span>
                </button>
              ))}
              {results.contacts.isLoading && (
                <p role="status" className="px-3 py-2 text-[11px] text-slate-400">Pesquisando contatos…</p>
              )}
              {!results.contacts.isLoading && !results.contacts.error && results.contacts.items.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-slate-400">Nenhuma conversa encontrada por nome ou telefone.</p>
              )}
              {results.contacts.error && (
                <div role="alert" className="px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                  <p>{results.contacts.error}</p>
                  <button type="button" onClick={() => void results.loadMoreContacts()} className="mt-1 font-semibold underline">
                    Tentar novamente
                  </button>
                </div>
              )}
              {results.contacts.hasMore && (
                <button type="button" disabled={results.contacts.isLoading} onClick={() => void results.loadMoreContacts()}
                  className="w-full rounded-md px-3 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-slate-800">
                  {results.contacts.isLoading ? 'Carregando…' : 'Ver mais 5 conversas'}
                </button>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
