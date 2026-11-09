import React, { memo } from 'react';
import type { SimulationTurnResult } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';

interface DiagnosticSituationCardProps {
  situation: SimulationTurnResult['situation'];
  matchedKeywords: string[];
}

export const DiagnosticSituationCard: React.FC<DiagnosticSituationCardProps> = memo(({
  situation,
  matchedKeywords,
}) => (
  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
      Situação Detectada pelo Motor de Regras
    </span>
    {situation ? (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {situation.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
            {situation.key}
          </span>
          <span
            className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
              situation.action === 'handoff_human'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            {situation.action === 'handoff_human'
              ? 'Transferência Humana'
              : 'Resposta Direta'}
          </span>
        </div>
        {matchedKeywords.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-1">
            <span className="text-[10px] text-slate-400">Termos encontrados:</span>
            {matchedKeywords.map((kw) => (
              <span
                key={kw}
                className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    ) : (
      <p className="text-xs text-slate-500 italic">
        Nenhuma regra de situação específica acionada. Atendimento seguiu diretrizes gerais.
      </p>
    )}
  </div>
));

DiagnosticSituationCard.displayName = 'DiagnosticSituationCard';
