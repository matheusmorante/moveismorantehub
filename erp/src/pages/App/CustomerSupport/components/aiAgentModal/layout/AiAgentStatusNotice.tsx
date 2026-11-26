import React, { memo } from 'react';

export interface AiAgentStatusNoticeProps {
  enabled: boolean;
}

export const AiAgentStatusNotice: React.FC<AiAgentStatusNoticeProps> = memo(({ enabled }) => (
  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80">
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        Status do Atendimento por IA
      </span>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          enabled
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
        />
        {enabled ? 'Ativado' : 'Desativado'}
      </span>
    </div>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
      {enabled
        ? 'O atendimento automático está limitado aos números de teste cadastrados. Altere o status no controle desta tela.'
        : 'A IA está desligada. Você pode ligá-la pelo controle nesta tela; a ativação continua limitada aos números de teste cadastrados.'}
    </p>
  </div>
));

AiAgentStatusNotice.displayName = 'AiAgentStatusNotice';
