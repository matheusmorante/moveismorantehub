import React from 'react';
import { SmartAIFillParsedResult } from './types';

interface SmartAIFillFeedbackProps {
  result: SmartAIFillParsedResult;
  busy: boolean;
  applyBlocked: boolean;
  onConfirmApply: () => void;
}

export const SmartAIFillFeedback: React.FC<SmartAIFillFeedbackProps> = ({
  result,
  busy,
  applyBlocked,
  onConfirmApply,
}) => {
  const identified = result.identifiedFields || {};
  const warnings = result.warnings || [];
  const missing = result.missingRequiredFields || [];

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Resultado da Análise da IA
          </h4>
        </div>
        <span className="text-[10px] font-bold text-slate-400">{result.summary}</span>
      </div>

      {/* Grid de Dados Identificados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Cliente
          </span>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
            {identified.clientName || 'Não identificado'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Telefone
          </span>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
            {identified.clientPhone || 'Não informado'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Produtos
          </span>
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {identified.itemsCount ? `${identified.itemsCount} item(ns)` : '0 itens'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Valor Total
          </span>
          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {identified.totalAmount
              ? Number(identified.totalAmount).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })
              : 'R$ 0,00'}
          </p>
        </div>
      </div>

      {/* ÁREA DE AVISOS E CAMPOS OBRIGATÓRIOS FALTANTES (DESTAQUE) */}
      {(missing.length > 0 || warnings.length > 0) && (
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <i className="bi bi-exclamation-triangle-fill text-sm" />
            <span className="text-[11px] font-black uppercase tracking-wider">
              Avisos e Campos Importantes Faltantes:
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {missing.map((m: string, idx: number) => (
              <div
                key={`missing-${idx}`}
                className="px-2.5 py-1 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 text-[10px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5"
              >
                <i className="bi bi-x-circle-fill text-amber-600 dark:text-amber-400 text-[10px]" />
                {m}
              </div>
            ))}
            {warnings.map((w: string, idx: number) => (
              <div
                key={`warn-${idx}`}
                className="px-2.5 py-1 rounded-lg bg-blue-100/60 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-1.5"
              >
                <i className="bi bi-info-circle-fill text-blue-500 text-[10px]" />
                {w}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1">
            Você pode complementar as informações no texto acima e clicar em "Gerar / Atualizar
            Novamente" ou aplicar e preencher manualmente no formulário.
          </p>
        </div>
      )}

      {/* Botão de Aplicação no Pedido */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onConfirmApply}
          disabled={busy || applyBlocked}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <i className="bi bi-check2-circle text-base" />
          Injetar e Preencher no Pedido
        </button>
      </div>
    </div>
  );
};
