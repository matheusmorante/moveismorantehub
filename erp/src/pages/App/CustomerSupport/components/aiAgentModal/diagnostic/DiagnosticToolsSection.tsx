import React, { memo } from 'react';
import type { SimulationTurnResult } from '@/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator';

interface DiagnosticToolsSectionProps {
  toolsCalled: SimulationTurnResult['toolsCalled'];
}

export const DiagnosticToolsSection: React.FC<DiagnosticToolsSectionProps> = memo(({ toolsCalled }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
        <i className="bi bi-tools text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        Ferramentas do ERP Chamadas ({toolsCalled.length})
      </span>
      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
        <i className="bi bi-shield-check" aria-hidden="true" />
        Preços de custo blindados
      </span>
    </div>

    {toolsCalled.length === 0 ? (
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-400 italic">
        Nenhuma ferramenta do ERP foi necessária para responder a esta mensagem.
      </div>
    ) : (
      <div className="space-y-2.5">
        {toolsCalled.map((tool, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-[10px] flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                {tool.name}
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Sucesso
              </span>
            </div>

            {/* Parâmetros */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Parâmetros Enviados:
              </span>
              <pre className="text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>

            {/* Retorno resumido */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Retorno do ERP:
              </span>
              {tool.result?.produtos ? (
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {tool.result.produtos.length} produto(s) consultado(s) em tempo real.
                  </p>
                  {tool.result.produtos.slice(0, 3).map((p: any, pIdx: number) => (
                    <div key={pIdx} className="text-[11px] text-slate-600 dark:text-slate-400">
                      • {p.nome} — R$ {p.precoVenda?.toFixed(2)} (Estoque: {p.quantidadeEstoque})
                    </div>
                  ))}
                </div>
              ) : tool.result?.produto ? (
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {tool.result.produto.nome}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Preço: R$ {tool.result.produto.precoVenda?.toFixed(2)} | Medidas: {tool.result.produto.dimensoes?.larguraCm} x {tool.result.produto.dimensoes?.alturaCm} x {tool.result.produto.dimensoes?.profundidadeCm} cm
                  </p>
                </div>
              ) : (
                <pre className="text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(tool.result, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
));

DiagnosticToolsSection.displayName = 'DiagnosticToolsSection';
