import React from 'react';
import { PostTemplate } from '../types/postTemplate';

interface DeleteTemplateModalProps {
  template: PostTemplate;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({
  template,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div>
              <h3 id="delete-modal-title" className="text-base font-semibold text-white">
                Excluir modelo de post?
              </h3>
              <p className="text-xs text-slate-400">
                Esta ação não poderá ser desfeita.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-sm font-medium text-slate-200">{template.name}</p>
            {template.description && (
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                {template.description}
              </p>
            )}
            <p className="mt-2 text-[11px] text-slate-500">
              {template.formats?.join(' · ') || template.aspectRatio} · {template.assets?.length || 0} arquivos
            </p>
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed">
            O modelo será removido permanentemente da sua lista de modelos e do banco de dados.
          </p>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void onConfirm()}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Excluindo...</span>
                </>
              ) : (
                <span>Excluir modelo</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
