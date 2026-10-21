import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CareWindow } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { formatDate } from '@/pages/utils/customerSupport/supportOrdersService';

const notesSchema = z.object({ notes: z.string().max(2000, 'Máximo de 2000 caracteres.') });
const tagSchema = z.object({
  tagInput: z.string().trim().min(1, 'Digite um marcador.').max(40, 'O marcador deve ter no máximo 40 caracteres.'),
});
type NotesFormData = z.infer<typeof notesSchema>;
type TagFormData = z.infer<typeof tagSchema>;

interface CustomerNotesTabProps {
  careWindow: CareWindow;
  lastCustomerMessageAt: string | null;
  initialNotes?: string | null;
  tags: string[];
  onAddTag: (tag: string) => Promise<boolean | void>;
  onRemoveTag: (tag: string) => Promise<boolean | void>;
  onSaveNotes: (notes: string) => Promise<boolean | void>;
}

export const CustomerNotesTab: React.FC<CustomerNotesTabProps> = ({
  careWindow,
  lastCustomerMessageAt,
  initialNotes = '',
  tags,
  onAddTag,
  onRemoveTag,
  onSaveNotes,
}) => {
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const {
    register: registerNotes,
    handleSubmit: handleNotesSubmit,
    reset: resetNotes,
    setError: setNotesError,
    clearErrors: clearNotesErrors,
    formState: { errors: notesErrors },
  } = useForm<NotesFormData>({ resolver: zodResolver(notesSchema), defaultValues: { notes: initialNotes || '' } });
  const {
    register: registerTag,
    handleSubmit: handleTagSubmit,
    reset: resetTag,
    setValue: setTagValue,
    setError: setTagError,
    clearErrors: clearTagErrors,
    formState: { errors: tagErrors, isSubmitting: isSavingTag },
  } = useForm<TagFormData>({ resolver: zodResolver(tagSchema), defaultValues: { tagInput: '' } });

  useEffect(() => {
    resetNotes({ notes: initialNotes || '' });
  }, [initialNotes, resetNotes]);

  const handleFormSubmit = async (data: NotesFormData) => {
    setIsSavingNotes(true);
    clearNotesErrors();
    try {
      const saved = await onSaveNotes(data.notes);
      if (saved === false) setNotesError('root.server', { message: 'Não foi possível salvar as notas.' });
    } catch {
      setNotesError('root.server', { message: 'Não foi possível salvar as notas. Tente novamente.' });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddTag = handleTagSubmit(async (data) => {
    clearTagErrors();
    if (tags.includes(data.tagInput)) {
      setTagError('tagInput', { message: 'Este marcador já existe.' });
      return;
    }
    try {
      const saved = await onAddTag(data.tagInput);
      if (saved === false) {
        setTagError('root.server', { message: 'Não foi possível salvar o marcador.' });
        return;
      }
      resetTag({ tagInput: '' });
    } catch {
      setTagError('root.server', { message: 'Não foi possível salvar o marcador. Tente novamente.' });
    }
  });

  const handleRemoveTag = (tag: string) => {
    setTagValue('tagInput', tag, { shouldValidate: false });
    void handleTagSubmit(async (data) => {
      clearTagErrors();
      try {
        const saved = await onRemoveTag(data.tagInput);
        if (saved === false) {
          setTagError('root.server', { message: 'Não foi possível remover o marcador.' });
          return;
        }
        resetTag({ tagInput: '' });
      } catch {
        setTagError('root.server', { message: 'Não foi possível remover o marcador. Tente novamente.' });
      }
    })();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className={`p-3.5 rounded-2xl border text-xs ${careWindow.isOpen ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'}`}>
        <div className="flex items-center gap-2 mb-1.5 font-bold">
          <i className={`bi ${careWindow.isOpen ? 'bi-clock-fill text-emerald-500' : 'bi-clock-history text-amber-500'}`} />
          <span>{careWindow.isOpen ? `Janela 24h Ativa (${careWindow.remainingHours}h ${careWindow.remainingMinutes}m)` : 'Janela 24h Expirada'}</span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-90">{careWindow.isOpen ? `Aberta pelo contato em ${formatDate(lastCustomerMessageAt)}. Expira às ${careWindow.expiresAt?.toLocaleTimeString('pt-BR')}.` : 'O cliente não enviou mensagens nas últimas 24 horas.'}</p>
      </div>

      <form onSubmit={handleAddTag} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Marcadores Internos</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              #{tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} disabled={isSavingTag} aria-label={`Remover tag ${tag}`} className="hover:text-red-500 ml-0.5"><i className="bi bi-x" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" {...registerTag('tagInput')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleAddTag(); } }} placeholder="Adicionar marcador" className="min-w-0 flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          <button type="submit" disabled={isSavingTag} className="px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">Adicionar</button>
        </div>
        {tagErrors.tagInput && <p role="alert" className="mt-1 text-[11px] text-red-600">{tagErrors.tagInput.message}</p>}
        {tagErrors.root?.server && <p role="alert" className="mt-1 text-[11px] text-red-600">{tagErrors.root.server.message}</p>}
      </form>

      <form onSubmit={handleNotesSubmit(handleFormSubmit)} className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notas Internas da Equipe</span>
          {isSavingNotes && <span className="text-[10px] text-emerald-500 font-semibold animate-pulse">Salvando…</span>}
        </div>
        <textarea rows={4} {...registerNotes('notes')} placeholder="Observações visíveis somente para a equipe interna..." className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none select-text" />
        {notesErrors.notes && <p role="alert" className="text-[11px] text-red-600">{notesErrors.notes.message}</p>}
        {notesErrors.root?.server && <p role="alert" className="text-[11px] text-red-600">{notesErrors.root.server.message}</p>}
        <button type="submit" disabled={isSavingNotes} className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50">Salvar Notas</button>
      </form>
    </div>
  );
};
