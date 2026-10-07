import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { safeFiscalIssueMessage } from '@/pages/utils/nfe/fiscalIssuePresentation';
import { NfeOrderSummary } from './NfeOrderSummary';

interface NfeGeneralTabProps {
  environment: 1 | 2;
  productionConfirmed: boolean;
  order: Order;
  finalConsumer: boolean;
  onFinalConsumerChange: (isFinalConsumer: boolean) => void;
  modelReason?: string;
  numberPreview: string;
  onNumberPreviewChange: (num: string) => void;
  numberPreviewContext: string;
  nfeNumberError: string | null;
  isSubmitting: boolean;
  isLocked: boolean;
  emissionResult: NfeEmissionResult | null;
  retryNumber?: string;
  onRetryNumberChange?: (val: string) => void;
  onRetry?: () => void;
  canOperateFiscal: boolean;
  isLoadingFiscalData: boolean;
  isLoadingNfeNumber: boolean;
  onReconcile?: () => void;
  onAbandonHmlTlsAttempt?: () => void;
  onStartFreshHmlEmission?: () => void;
  onCorrectFiscalData?: () => void;
  onClose?: () => void;
}

export const NfeGeneralTab: React.FC<NfeGeneralTabProps> = ({
  environment,
  productionConfirmed,
  order,
  finalConsumer,
  onFinalConsumerChange,
  modelReason,
  numberPreview,
  onNumberPreviewChange,
  numberPreviewContext,
  nfeNumberError,
  isSubmitting,
  isLocked,
  emissionResult,
  retryNumber = '',
  onRetryNumberChange,
  onRetry,
  canOperateFiscal,
  isLoadingFiscalData,
  isLoadingNfeNumber,
  onReconcile,
  onAbandonHmlTlsAttempt,
  onStartFreshHmlEmission,
  onCorrectFiscalData,
  onClose,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Aviso de Ambiente Homologação */}
      {environment === 2 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <i className="bi bi-shield-exclamation mt-0.5 shrink-0 text-xl text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Homologação · teste sem valor fiscal
            </p>
            <p className="mt-1 leading-relaxed text-amber-800 dark:text-amber-200">
              A SEFAZ receberá este documento no ambiente de testes. Ele não comprova uma venda
              fiscal em produção.
            </p>
          </div>
        </div>
      )}

      {/* Resumo do Pedido */}
      <NfeOrderSummary order={order} />

      {/* Modelo Fiscal e Finalidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Finalidade da Operação
            </span>
            <label className="mt-2 flex flex-col gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              Finalidade da compra
              <select
                aria-label="Finalidade da compra"
                value={finalConsumer ? 'use' : 'resale'}
                disabled={isSubmitting || isLocked}
                onChange={(event) => onFinalConsumerChange(event.target.value === 'use')}
                className="rounded-none border-0 border-b-2 border-slate-200 bg-white p-2 text-xs outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
              >
                <option value="use">Uso / consumo próprio</option>
                <option value="resale">Revenda</option>
              </select>
            </label>
          </div>
          {modelReason && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">{modelReason}</p>
            </div>
          )}
        </section>

        {/* Número da Nota e Série */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Sequência
            </span>
            <label className="mt-2 flex flex-col gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              Número da nota
              <input
                aria-label="Número da nota"
                type="number"
                min={1}
                max={999999999}
                step={1}
                value={
                  isLocked && emissionResult?.nfeNumber
                    ? String(emissionResult.nfeNumber)
                    : numberPreview
                }
                readOnly={isLocked || isSubmitting || isLoadingNfeNumber}
                onChange={(e) => onNumberPreviewChange(e.target.value.replace(/\D/g, ''))}
                placeholder="Consultando..."
                className="mt-1 w-full rounded-none border-0 border-b-2 border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500"
              />
            </label>
          </div>
          <div className="mt-3">
            <span
              data-testid="nfe-number-preview-context"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              {numberPreviewContext}
            </span>
            {isLoadingNfeNumber && (
              <p
                role="status"
                aria-live="polite"
                className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                Atualizando a prévia no banco. O número definitivo é reservado ao emitir.
              </p>
            )}
            {nfeNumberError && (
              <p
                role="status"
                className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300"
              >
                Prévia indisponível. {nfeNumberError} A reserva automática continua no backend ao
                emitir.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Avisos da SEFAZ */}
      {emissionResult?.validation?.warnings?.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {emissionResult.validation.warnings.map((warning, index) => (
            <p key={`${index}-${warning}`}>
              • {safeFiscalIssueMessage(warning, 'Há um aviso na preparação fiscal do documento.')}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
};
