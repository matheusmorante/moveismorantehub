import React from 'react';

interface SelectedMessageActionBarProps {
  selectedMessagePreview: string;
  selectedCount: number;
  canReply: boolean;
  canForward: boolean;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  onCancel: () => void;
}

export const SelectedMessageActionBar: React.FC<SelectedMessageActionBarProps> = ({
  selectedMessagePreview,
  selectedCount,
  canReply,
  canForward,
  onReply,
  onForward,
  onDelete,
  isDeleting = false,
  onCancel,
}) => {
  return (
    <div className="relative z-20 flex min-h-14 shrink-0 items-center gap-2 border-b border-emerald-100 bg-white/95 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-[#202c33] sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {selectedCount === 1 ? 'Mensagem selecionada' : `${selectedCount} mensagens selecionadas`}
        </p>
        <p className="truncate text-xs text-slate-600 dark:text-slate-300" title={selectedMessagePreview}>
          {selectedMessagePreview}
        </p>
      </div>
      {selectedCount === 1 && canReply && (
        <button
          type="button"
          onClick={onReply}
          aria-label="Responder mensagem selecionada"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-emerald-950/40"
        >
          <i className="bi bi-reply-fill" aria-hidden="true" />
          Responder
        </button>
      )}
      {selectedCount === 1 && canForward && (
        <button
          type="button"
          onClick={onForward}
          aria-label="Encaminhar mensagem selecionada"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-emerald-950/40"
        >
          <i className="bi bi-forward-fill" aria-hidden="true" />
          Encaminhar
        </button>
      )}
      <button
        type="button"
        disabled={isDeleting}
        onClick={onDelete}
        aria-label="Excluir mensagens selecionadas da Central"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        <i className="bi bi-trash3" aria-hidden="true" />
        {isDeleting ? 'Excluindo…' : 'Excluir'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar seleção da mensagem"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <i className="bi bi-x-lg text-xs" aria-hidden="true" />
      </button>
    </div>
  );
};
