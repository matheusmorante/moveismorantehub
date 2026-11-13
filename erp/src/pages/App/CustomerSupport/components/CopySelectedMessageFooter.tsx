import React from 'react';
import { toast } from 'react-toastify';

interface CopySelectedMessageFooterProps {
  messageText: string;
  onCancel: () => void;
}

export const CopySelectedMessageFooter: React.FC<CopySelectedMessageFooterProps> = ({
  messageText,
  onCancel,
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      toast.success('Mensagem copiada.');
    } catch {
      toast.error('Não foi possível copiar a mensagem.');
    }
  };

  return (
    <div className="relative z-10 flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Mensagem selecionada
        </p>
        <p className="truncate text-xs text-slate-700 dark:text-slate-200" title={messageText}>
          {messageText}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label="Copiar texto da mensagem selecionada"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <i className="bi bi-clipboard" aria-hidden="true" />
        Copiar
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar seleção da mensagem"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <i className="bi bi-x-lg text-xs" aria-hidden="true" />
      </button>
    </div>
  );
};
