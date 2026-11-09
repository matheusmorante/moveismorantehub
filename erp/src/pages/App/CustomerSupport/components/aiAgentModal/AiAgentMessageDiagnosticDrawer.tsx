import React, { memo } from 'react';
import type { SimulationTurnResult } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';
import {
  DiagnosticMetricsCards,
  DiagnosticSituationCard,
  DiagnosticToolsSection,
  DiagnosticKnowledgeAndPhrasesSection,
} from './diagnostic';

export interface AiAgentMessageDiagnosticDrawerProps {
  diagnostic: SimulationTurnResult | null;
  onClose: () => void;
}

export const AiAgentMessageDiagnosticDrawer: React.FC<AiAgentMessageDiagnosticDrawerProps> = memo(({
  diagnostic,
  onClose,
}) => {
  if (!diagnostic) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes da Execução da Resposta"
      className="fixed inset-y-0 right-0 z-[9999999] w-full sm:w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slide-left overflow-hidden"
    >
      {/* Header do Drawer */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">
            <i className="bi bi-cpu text-sm" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Detalhes da Execução
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Diagnóstico operacional e ferramentas do ERP acionadas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel de diagnóstico"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <i className="bi bi-x-lg text-sm" aria-hidden="true" />
        </button>
      </div>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        <DiagnosticMetricsCards diagnostic={diagnostic} />

        <DiagnosticSituationCard
          situation={diagnostic.situation}
          matchedKeywords={diagnostic.matchedKeywords}
        />

        <DiagnosticToolsSection toolsCalled={diagnostic.toolsCalled} />

        <DiagnosticKnowledgeAndPhrasesSection
          articlesUsed={diagnostic.articlesUsed}
          mandatoryPhrasesEnforced={diagnostic.mandatoryPhrasesEnforced}
        />
      </div>
    </div>
  );
});

AiAgentMessageDiagnosticDrawer.displayName = 'AiAgentMessageDiagnosticDrawer';
