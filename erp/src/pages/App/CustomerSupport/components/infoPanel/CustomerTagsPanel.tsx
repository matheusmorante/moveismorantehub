import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isReservedSupportTag, supportTagSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';

type TagFormData = z.infer<typeof supportTagSchema>;

interface CustomerTagsPanelProps {
  tags: string[];
  onAddTag: (tag: string) => Promise<boolean | void>;
  onRemoveTag: (tag: string) => Promise<boolean | void>;
}

export const CustomerTagsPanel: React.FC<CustomerTagsPanelProps> = ({ tags, onAddTag, onRemoveTag }) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TagFormData>({ resolver: zodResolver(supportTagSchema), defaultValues: { tagInput: '' } });

  const addTag = handleSubmit(async ({ tagInput }) => {
    clearErrors();
    if (tags.some((tag) => tag.toLocaleLowerCase() === tagInput.toLocaleLowerCase())) {
      setError('tagInput', { message: 'Este marcador já existe.' });
      return;
    }
    try {
      const saved = await onAddTag(tagInput);
      if (saved === false) {
        setError('root.server', { message: 'Não foi possível salvar o marcador.' });
        return;
      }
      reset({ tagInput: '' });
    } catch {
      setError('root.server', { message: 'Não foi possível salvar o marcador. Tente novamente.' });
    }
  });

  const removeTag = (tag: string) => {
    setValue('tagInput', tag, { shouldValidate: false });
    void handleSubmit(async ({ tagInput }) => {
      clearErrors();
      try {
        const saved = await onRemoveTag(tagInput);
        if (saved === false) {
          setError('root.server', { message: 'Não foi possível remover o marcador.' });
          return;
        }
        reset({ tagInput: '' });
      } catch {
        setError('root.server', { message: 'Não foi possível remover o marcador. Tente novamente.' });
      }
    })();
  };

  return (
    <section aria-label="Marcadores internos" className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Marcadores internos</span>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tags.filter((tag) => !isReservedSupportTag(tag)).map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} disabled={isSubmitting} aria-label={`Remover tag ${tag}`} className="ml-0.5 hover:text-red-500"><i className="bi bi-x" /></button>
          </span>
        ))}
      </div>
      <form onSubmit={addTag} className="flex gap-2">
        <input type="text" {...register('tagInput')} placeholder="Adicionar marcador" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-50">Adicionar</button>
      </form>
      {errors.tagInput && <p role="alert" className="mt-1 text-[11px] text-red-600">{errors.tagInput.message}</p>}
      {errors.root?.server && <p role="alert" className="mt-1 text-[11px] text-red-600">{errors.root.server.message}</p>}
    </section>
  );
};
