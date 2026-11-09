import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supportInternalCommentSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type { WhatsAppMessage } from '../../types';

interface ChatInternalCommentsPanelProps {
  isActive?: boolean;
  canShareCommercialInfo?: boolean;
  internalNotes?: string | null;
  internalComments?: WhatsAppMessage[];
  onAddInternalNote?: (text: string) => Promise<boolean | void>;
  onReturnToChat?: () => void;
  onClose?: () => void;
  onQuickReply?: () => void;
}

export const ChatInternalCommentsPanel: React.FC<ChatInternalCommentsPanelProps> = ({
  isActive = true,
  canShareCommercialInfo = false,
  internalNotes = null,
  internalComments = [],
  onAddInternalNote,
  onReturnToChat,
  onClose,
  onQuickReply,
}) => {
  const handleClose = onReturnToChat || onClose || (() => undefined);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ comment: string }>({
    resolver: zodResolver(supportInternalCommentSchema),
    defaultValues: { comment: '' },
  });

  const submitComment = handleSubmit(async (data) => {
    if (!onAddInternalNote) return;
    try {
      const saved = await onAddInternalNote(data.comment);
      if (saved === false) {
        setError('root.server', { message: 'Não foi possível salvar o comentário.' });
        return;
      }
      reset({ comment: '' });
      handleClose();
    } catch {
      setError('root.server', { message: 'Não foi possível salvar o comentário. Tente novamente.' });
    }
  });

  if (!isActive) return null;

  return (
    <form onSubmit={submitComment} className="flex flex-col gap-2 rounded-2xl border-2 border-amber-400/80 bg-amber-50/80 p-3 shadow-md dark:border-amber-600/70 dark:bg-amber-950/30">
      <div className="flex items-center justify-between gap-3 border-b border-amber-200/70 pb-1.5 text-xs font-bold text-amber-900 dark:border-amber-800/60 dark:text-amber-200">
        <span className="flex items-center gap-1.5"><i className="bi bi-lock-fill text-amber-600" />Comentário interno da equipe</span>
        <button type="button" onClick={handleClose} className="text-[11px] text-amber-700 underline dark:text-amber-300">Voltar ao atendimento</button>
      </div>
      <div aria-label="Comentários internos salvos" className="max-h-36 space-y-2 overflow-y-auto">
        {canShareCommercialInfo && internalNotes?.trim() && (
          <article className="rounded-xl border border-amber-200 bg-white/80 p-2.5 dark:border-amber-800/60 dark:bg-slate-900/60">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">Anotação interna salva</p>
            <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-200">{internalNotes}</p>
          </article>
        )}
        {[...internalComments].sort((left, right) => right.timestamp.localeCompare(left.timestamp)).map((comment) => (
          <article key={comment.id} className="rounded-xl border border-amber-200 bg-white/80 p-2.5 dark:border-amber-800/60 dark:bg-slate-900/60">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-amber-800 dark:text-amber-300">
              <span className="font-bold">{comment.authorName || 'Equipe'}</span>
              <time dateTime={comment.timestamp}>{new Date(comment.timestamp).toLocaleString('pt-BR')}</time>
            </div>
            <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-200">{comment.textContent}</p>
          </article>
        ))}
        {(!canShareCommercialInfo || !internalNotes?.trim()) && internalComments.length === 0 && (
          <p className="rounded-xl border border-dashed border-amber-200 px-3 py-2 text-xs text-amber-800/80 dark:border-amber-800/60 dark:text-amber-300/80">Nenhum comentário interno salvo nesta conversa.</p>
        )}
      </div>
      <textarea
        {...register('comment')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void submitComment();
          }
        }}
        rows={3}
        autoFocus
        placeholder="Escreva uma anotação visível apenas para a equipe…"
        className="w-full resize-none rounded-xl border border-amber-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-amber-700/60 dark:bg-slate-900 dark:text-slate-100"
      />
      {errors.comment && <p role="alert" className="text-[11px] text-red-600">{errors.comment.message}</p>}
      {errors.root?.server && <p role="alert" className="text-[11px] text-red-600">{errors.root.server.message}</p>}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onQuickReply} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300"><i className="bi bi-lightning-charge-fill" />Inserir resposta rápida</button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleClose} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Cancelar</button>
          <button type="submit" disabled={isSubmitting || !onAddInternalNote} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"><i className="bi bi-check-lg" />{isSubmitting ? 'Salvando…' : 'Salvar Comentário'}</button>
        </div>
      </div>
    </form>
  );
};
