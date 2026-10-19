import React from 'react';
import type { FiscalOrderEditPolicyAlertProps } from './types';
import {
  FISCAL_CORRECTION_POLICY_NOTICE,
  FISCAL_CORRECTION_RULES,
} from '@/pages/utils/nfe/orderEditFiscalPolicy';

export const FiscalOrderEditPolicyAlert: React.FC<FiscalOrderEditPolicyAlertProps> = ({
  isBlocked,
  isProduction,
  error,
}) => {
  return (
    <>
      {/* Cabeçalho de Identificação e Política de Produto */}
      <div
        className={`border-b px-6 py-4 transition-colors ${
          isBlocked
            ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40'
            : 'border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/30'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
              isBlocked
                ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100'
                : 'bg-amber-200 text-[#3b1900] dark:bg-amber-900/80 dark:text-amber-100'
            }`}
          >
            <i className="bi bi-shield-lock-fill" />
            Política MoranteHub: Zero CC-e
          </span>
          {isProduction && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Ambiente de Produção
            </span>
          )}
        </div>

        <h3
          id="fiscal-order-edit-title"
          className="text-base font-black text-slate-900 dark:text-white sm:text-lg flex items-center gap-2"
        >
          {isBlocked ? (
            <>
              <i className="bi bi-slash-circle-fill text-rose-600 dark:text-rose-400" />
              Alteração fiscal não permitida · Documento autorizado
            </>
          ) : (
            <>
              <i className="bi bi-exclamation-triangle-fill text-amber-600 dark:text-amber-400" />
              Correção fiscal e integridade de nota autorizada
            </>
          )}
        </h3>

        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {FISCAL_CORRECTION_POLICY_NOTICE}
        </p>
      </div>

      {/* Caixa de Contexto e Regras */}
      {isBlocked ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
          <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-2 mb-2">
            <i className="bi bi-x-octagon-fill text-sm" />
            Impedimento fiscal identificado
          </h4>
          <p className="text-xs font-semibold text-rose-950 dark:text-rose-200 leading-relaxed mb-3">
            {error ||
              'A mercadoria já circulou ou a situação fiscal impede a substituição direta da nota.'}
          </p>
          <div className="border-t border-rose-200/80 pt-3 dark:border-rose-900/40 text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5">
            <p>
              <strong>Regra fiscal mandatória:</strong> {FISCAL_CORRECTION_RULES.GOODS_CIRCULATED_BLOCKED}
            </p>
            <p className="font-semibold text-rose-900 dark:text-rose-200">
              Procedimento legal adequado: Realize o procedimento de devolução fiscal (emissão de NF-e modelo 55 de devolução após o retorno físico dos itens).
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#3b1900] dark:text-amber-300 flex items-center gap-2 mb-1.5">
            <i className="bi bi-info-circle-fill text-sm text-amber-700 dark:text-amber-400" />
            Procedimento fiscalmente permitido
          </h4>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            As alterações realizadas divergem de dados fiscais importantes (destinatário, produtos, valores ou tributação) já autorizados na SEFAZ. O ERP abrirá as etapas de reversão integral e posterior nova emissão com os dados corrigidos.
          </p>
        </div>
      )}
    </>
  );
};
