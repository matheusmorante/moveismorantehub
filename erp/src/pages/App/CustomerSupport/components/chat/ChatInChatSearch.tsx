import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { supportMessageSearchSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';

type MessageSearchForm = z.infer<typeof supportMessageSearchSchema>;

interface ChatInChatSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
}

export const ChatInChatSearch: React.FC<ChatInChatSearchProps> = ({
  searchQuery,
  onSearchChange,
  onClose,
}) => {
  const { register, handleSubmit, reset, setValue, watch, getValues, trigger, formState: { errors } } = useForm<MessageSearchForm>({
    resolver: zodResolver(supportMessageSearchSchema), defaultValues: { search: searchQuery },
    mode: 'onChange',
  });
  useEffect(() => { reset({ search: searchQuery }); }, [reset, searchQuery]);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;
  const draft = watch('search');
  useEffect(() => {
    const trimmedDraft = (draft || '').trim();
    if (trimmedDraft === searchQuery.trim()) return;
    let active = true;
    void trigger('search').then((isValid) => {
      if (!active || getValues('search').trim() !== trimmedDraft) return;
      if (isValid) onSearchChangeRef.current(trimmedDraft);
      else if (searchQuery) onSearchChangeRef.current('');
    });
    return () => { active = false; };
  }, [draft, getValues, searchQuery, trigger]);
  const submitSearch = handleSubmit((data) => onSearchChange(data.search));

  return (
    <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 z-10 animate-slide-down">
      <form onSubmit={submitSearch} className="flex items-center gap-2">
        <i className="bi bi-search text-slate-400 text-xs"></i>
        <input
          type="search"
          {...register('search')}
          aria-label="Pesquisar nesta conversa"
          placeholder="Pesquisar nesta conversa..."
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 border-none focus:outline-none"
        />
        {draft && (
          <button
            type="button"
            onClick={() => {
              setValue('search', '', { shouldValidate: true });
              onSearchChangeRef.current('');
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Limpar pesquisa"
          >
            <i className="bi bi-x-circle-fill text-xs"></i>
          </button>
        )}
        <button type="submit" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Buscar</button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-2 cursor-pointer"
        >
          Fechar
        </button>
      </form>
      {errors.search && <p role="alert" className="mt-1 text-[11px] text-red-600">{errors.search.message}</p>}
    </div>
  );
};
