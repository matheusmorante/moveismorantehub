import React from 'react';

interface SilentHandoffAlertBannerProps {
  reason?: string | null;
  onAssumeChat?: () => void;
  onReactivateAi?: () => void;
}

export const SilentHandoffAlertBanner: React.FC<SilentHandoffAlertBannerProps> = ({
  reason,
  onAssumeChat,
  onReactivateAi,
}) => {
  return (
    <div
      data-testid="banner-intervencao-humana"
      className="relative z-10 mx-3 my-2 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/95 dark:bg-[#2a1e0b] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-text"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
          <i className="bi bi-exclamation-triangle-fill text-base text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-100">
              Intervenção humana necessária
            </span>
            <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/40 px-2 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-800">
              IA pausada nesta conversa
            </span>
          </div>
          <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-1 leading-snug">
            {reason || 'A IA não encontrou uma regra confiável para confirmar essa solicitação.'}
          </p>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
            Aviso interno — não enviado ao cliente.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {onAssumeChat && (
          <button
            type="button"
            onClick={onAssumeChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <i className="bi bi-person-check-fill" aria-hidden="true" />
            Assumir atendimento
          </button>
        )}
        {onReactivateAi && (
          <button
            type="button"
            onClick={onReactivateAi}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-100/50 dark:hover:bg-slate-750 text-xs font-semibold shadow-2xs transition-colors"
            title="Reativar respostas automáticas da IA nesta conversa"
          >
            <i className="bi bi-robot" aria-hidden="true" />
            Reativar IA
          </button>
        )}
      </div>
    </div>
  );
};
