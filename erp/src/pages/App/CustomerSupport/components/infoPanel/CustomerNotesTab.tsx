import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CareWindow } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { formatDate } from '@/pages/utils/customerSupport/supportOrdersService';

const notesSchema = z.object({
  notes: z.string().max(2000, 'Máximo de 2000 caracteres.'),
  tagInput: z.string().optional(),
});

type NotesFormData = z.infer<typeof notesSchema>;

interface CustomerNotesTabProps {
  careWindow: CareWindow;
  lastCustomerMessageAt: string | null;
  initialNotes?: string | null;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onSaveNotes: (notes: string) => Promise<void>;
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

  const { register, handleSubmit, reset } = useForm<NotesFormData>({
    resolver: zodResolver(notesSchema),
    defaultValues: {
      notes: initialNotes || '',
      tagInput: '',
    },
  });

  useEffect(() => {
    reset({
      notes: initialNotes || '',
      tagInput: '',
    });
  }, [initialNotes, reset]);

  const handleFormSubmit = async (data: NotesFormData) => {
    setIsSavingNotes(true);
    try {
      await onSaveNotes(data.notes);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (e.currentTarget.value || '').trim();
      if (val) {
        onAddTag(val);
        e.currentTarget.value = '';
      }
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Status da Janela de 24 Horas */}
      <div
        className={`p-3.5 rounded-2xl border text-xs ${
          careWindow.isOpen
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 font-bold">
          <i
            className={`bi ${
              careWindow.isOpen
                ? 'bi-clock-fill text-emerald-500'
                : 'bi-clock-history text-amber-500'
            }`}
          ></i>
          <span>
            {careWindow.isOpen
              ? `Janela 24h Ativa (${careWindow.remainingHours}h ${careWindow.remainingMinutes}m)`
              : 'Janela 24h Expirada'}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-90">
          {careWindow.isOpen
            ? `Aberta pelo contato em ${formatDate(lastCustomerMessageAt)}. Expira às ${careWindow.expiresAt?.toLocaleTimeString('pt-BR')}.`
            : 'O cliente não enviou mensagens nas últimas 24 horas.'}
        </p>
      </div>

      {/* Marcadores / Tags Internas */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Marcadores Internos
        </span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
            >
              #{t}
              <button
                type="button"
                onClick={() => onRemoveTag(t)}
                className="hover:text-red-500 ml-0.5 cursor-pointer"
                aria-label={`Remover tag ${t}`}
              >
                <i className="bi bi-x"></i>
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Adicionar marcador e pressionar Enter..."
          onKeyDown={handleKeyDownTag}
          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Notas Internas com React Hook Form + zodResolver */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Notas Internas da Equipe
          </span>
          {isSavingNotes && (
            <span className="text-[10px] text-emerald-500 font-semibold animate-pulse">
              Salvando...
            </span>
          )}
        </div>
        <textarea
          rows={4}
          {...register('notes')}
          placeholder="Observações visíveis somente para a equipe interna..."
          className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none select-text"
        />
        <button
          type="submit"
          disabled={isSavingNotes}
          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
        >
          Salvar Notas
        </button>
      </form>
    </div>
  );
};
