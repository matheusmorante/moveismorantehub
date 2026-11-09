import React from 'react';
import type { SimulationTurnResult } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';

interface SimulatorRealResultCardProps {
  result: SimulationTurnResult;
}

export const SimulatorRealResultCard: React.FC<SimulatorRealResultCardProps> = ({ result }) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 shadow-xs space-y-4 animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <i className="bi bi-robot text-indigo-600 dark:text-indigo-400 text-sm" aria-hidden="true" />
          Execução Real do Agente (Sandbox Dry-Run)
        </span>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
          {result.executionTimeMs} ms
        </span>
      </div>

      {result.error ? (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          <i className="bi bi-exclamation-triangle-fill mr-1.5" />
          Erro na execução da IA: {result.error}
        </div>
      ) : (
        <>
          {/* Ferramentas do ERP executadas */}
          {result.toolsCalled.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <i className="bi bi-tools text-xs" />
                Ferramentas do ERP Executadas ({result.toolsCalled.length})
              </span>
              <div className="space-y-1.5">
                {result.toolsCalled.map((tool, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {tool.name}({JSON.stringify(tool.args)})
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        Retorno Seguro OK
                      </span>
                    </div>
                    {tool.result?.produtos && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        {tool.result.produtos.length} item(ns) consultado(s) no estoque do ERP.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resposta Gerada pelo Modelo */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <i className="bi bi-chat-quote-fill text-xs" />
              Resposta Final Gerada para o WhatsApp
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
              {result.aiResponseText}
            </p>
          </div>

          {/* Frases Obrigatórias Enforcadas */}
          {result.mandatoryPhrasesEnforced.length > 0 && (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-medium">
              <i className="bi bi-shield-check" />
              Frase obrigatória injetada deterministicamente: &ldquo;
              {result.mandatoryPhrasesEnforced[0]}&rdquo;
            </div>
          )}
        </>
      )}
    </div>
  );
};
