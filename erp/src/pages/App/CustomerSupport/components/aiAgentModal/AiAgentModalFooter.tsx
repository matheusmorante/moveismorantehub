import React, { memo } from 'react';

export interface AiAgentModalFooterProps {
  isSaving: boolean;
  isAdministrator: boolean;
  onClose: () => void;
}

export const AiAgentModalFooter: React.FC<AiAgentModalFooterProps> = memo(({
  isSaving,
  isAdministrator,
  onClose,
}) => (
  <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
    <div>
      {!isAdministrator && (
        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          <i className="bi bi-lock-fill" aria-hidden="true" />
          Apenas administradores podem salvar alterações nestas configurações.
        </p>
      )}
    </div>
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onClose}
        disabled={isSaving}
        className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="whatsapp-ai-agent-form"
        disabled={isSaving || !isAdministrator}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Salvando…
          </>
        ) : (
          <>
            <i className="bi bi-check2" aria-hidden="true" />
            Salvar Configurações
          </>
        )}
      </button>
    </div>
  </div>
));

AiAgentModalFooter.displayName = 'AiAgentModalFooter';
