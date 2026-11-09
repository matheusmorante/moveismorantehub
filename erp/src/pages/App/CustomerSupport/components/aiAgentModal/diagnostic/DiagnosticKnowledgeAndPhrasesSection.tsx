import React, { memo } from 'react';
import type { SimulationTurnResult } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';

interface DiagnosticKnowledgeAndPhrasesSectionProps {
  articlesUsed: SimulationTurnResult['articlesUsed'];
  mandatoryPhrasesEnforced: string[];
}

export const DiagnosticKnowledgeAndPhrasesSection: React.FC<DiagnosticKnowledgeAndPhrasesSectionProps> = memo(({
  articlesUsed,
  mandatoryPhrasesEnforced,
}) => (
  <>
    {/* Base de Conhecimento Consultada */}
    <div className="space-y-2">
      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
        Base de Conhecimento Oficial ({articlesUsed.length})
      </span>
      <div className="space-y-2">
        {articlesUsed.map((art) => (
          <div
            key={art.id}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
          >
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                {art.title}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Categoria: {art.category}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
              Prioridade {art.priority}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* Frases Obrigatórias Enforcadas */}
    {mandatoryPhrasesEnforced.length > 0 && (
      <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
          <i className="bi bi-shield-check text-xs" aria-hidden="true" />
          Frases Obrigatórias com Garantia Determinística
        </span>
        <div className="space-y-1">
          {mandatoryPhrasesEnforced.map((phrase, idx) => (
            <p key={idx} className="text-xs text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed">
              &ldquo;{phrase}&rdquo;
            </p>
          ))}
        </div>
      </div>
    )}
  </>
));

DiagnosticKnowledgeAndPhrasesSection.displayName = 'DiagnosticKnowledgeAndPhrasesSection';
