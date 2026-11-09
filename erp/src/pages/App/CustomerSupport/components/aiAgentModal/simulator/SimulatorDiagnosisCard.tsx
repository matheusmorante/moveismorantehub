import React from 'react';
import type {
  AiSituationRule,
  AiKnowledgeArticle,
  AiWorkflowConfig,
} from '../../../../../../../../shared-utils/whatsappAiAgentSchemas';

interface SimulatorDiagnosisCardProps {
  situation: AiSituationRule | null;
  matchedKeywords: string[];
  relevantArticles: AiKnowledgeArticle[];
  workflow: AiWorkflowConfig | null;
}

export const SimulatorDiagnosisCard: React.FC<SimulatorDiagnosisCardProps> = ({
  situation,
  matchedKeywords,
  relevantArticles,
  workflow,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <i className="bi bi-check2-circle text-emerald-600 dark:text-emerald-400 text-sm" aria-hidden="true" />
          Resultado do Diagnóstico do Motor
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
          Análise Concluída
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Situação Identificada */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Situação Identificada
          </span>
          {situation ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {situation.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                  {situation.situationKey}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400">Ação:</span>
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
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">Termos detectados:</span>
                  {matchedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Nenhuma situação específica atingiu o limiar de correspondência. Atendimento segue fluxo geral.
            </p>
          )}
        </div>

        {/* Fluxo Orientado */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Fluxo Ativado
          </span>
          {workflow ? (
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {workflow.name}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {workflow.description}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Fluxo livre de conversação.</p>
          )}
        </div>
      </div>

      {/* Artigos Confiáveis Recuperados */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Artigos da Base de Conhecimento Injetados ({relevantArticles.length})
        </span>
        <div className="space-y-1.5">
          {relevantArticles.map((art, idx) => (
            <div
              key={art.id}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {art.title}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 dark:bg-slate-700 text-slate-500">
                  v{art.version || 1}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Prioridade {art.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
