import React, { memo } from 'react';
import type { SimulationTurnResult } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';

interface DiagnosticMetricsCardsProps {
  diagnostic: SimulationTurnResult;
}

export const DiagnosticMetricsCards: React.FC<DiagnosticMetricsCardsProps> = memo(({ diagnostic }) => (
  <div className="grid grid-cols-3 gap-2.5">
    <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 text-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">
        Latência
      </span>
      <span className="text-base font-extrabold text-indigo-950 dark:text-indigo-200">
        {(diagnostic.executionTimeMs / 1000).toFixed(1)}s
      </span>
    </div>

    <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
        Ferramentas
      </span>
      <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">
        {diagnostic.toolsCalled.length}
      </span>
    </div>

    <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 text-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
        Fontes/Regras
      </span>
      <span className="text-base font-extrabold text-blue-950 dark:text-blue-200">
        {diagnostic.articlesUsed.length + (diagnostic.situation ? 1 : 0)}
      </span>
    </div>
  </div>
));

DiagnosticMetricsCards.displayName = 'DiagnosticMetricsCards';
