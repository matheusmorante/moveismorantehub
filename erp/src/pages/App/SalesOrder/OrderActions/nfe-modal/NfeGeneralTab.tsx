import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { NfeOrderSummary } from './NfeOrderSummary';

interface NfeGeneralTabProps {
  environment: 1 | 2;
  productionConfirmed: boolean;
  onProductionConfirmedChange: (confirmed: boolean) => void;
  order: Order;
  finalConsumer: boolean;
  onFinalConsumerChange: (isFinalConsumer: boolean) => void;
  modelLabel: string;
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
  fiscalPreparationError: string | null;
  onReconcile?: () => void;
}

export const NfeGeneralTab: React.FC<NfeGeneralTabProps> = ({
  environment,
  productionConfirmed,
  onProductionConfirmedChange,
  order,
  finalConsumer,
  onFinalConsumerChange,
  modelLabel,
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
  fiscalPreparationError,
  onReconcile,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Aviso de Ambiente */}
      {environment === 2 ? (
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
      ) : (
        <div className="space-y-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="flex items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill mt-0.5 shrink-0 text-xl text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                Produção · documento fiscal válido
              </p>
              <p className="mt-1 leading-relaxed text-rose-800 dark:text-rose-200">
                A emissão será transmitida à SEFAZ como documento real. Confira pedido, itens,
                destinatário e NCM antes de confirmar.
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-2 font-bold text-rose-900 dark:text-rose-100">
            <input
              type="checkbox"
              checked={productionConfirmed}
              onChange={(event) => onProductionConfirmedChange(event.target.checked)}
              className="mt-0.5 accent-rose-600"
            />
            <span>Confirmo que quero transmitir esta nota em Produção.</span>
          </label>
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
              Sequência e Numeração
            </span>
            <label className="mt-2 flex flex-col gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              Número da nota
              <input
                aria-label="Número da nota"
                type="number"
                min={1}
                max={999999999}
                step={1}
                value={numberPreview}
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

      {/* Alertas de Preparação e Erros SEFAZ */}
      {fiscalPreparationError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <p className="font-bold">
            Os itens foram carregados, mas a preparação fiscal falhou. A emissão está bloqueada até
            que a configuração seja carregada com sucesso.
          </p>
          <p className="mt-1">{fiscalPreparationError}</p>
        </div>
      )}

      {emissionResult && !emissionResult.success && (emissionResult.pending || emissionResult.numberConflict) && (
        <div
          role="alert"
          className={`rounded-2xl border p-4 text-xs ${
            emissionResult.pending
              ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
              : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
          }`}
        >
          <p className="font-black text-sm">
            {emissionResult.pending
              ? 'Emissão pendente de confirmação'
              : 'Não foi possível autorizar a nota'}
          </p>
          <p className="mt-1">{emissionResult.error}</p>
          {emissionResult.numberConflict && (
            <div className="mt-3 rounded-xl border border-rose-300 bg-white/70 p-3 dark:border-rose-800 dark:bg-slate-950/50">
              <p className="font-bold">
                Número {emissionResult.numberConflict.previousNumber} já está sendo usado.
                {emissionResult.numberConflict.nextNumber
                  ? ` Número sugerido: ${emissionResult.numberConflict.previousNumber} → ${emissionResult.numberConflict.nextNumber}.`
                  : ' Digite outro número para continuar.'}
              </p>
              <label className="mt-2 flex max-w-xs flex-col gap-1 font-semibold">
                Novo número da nota
                <input
                  aria-label="Novo número da nota fiscal"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={retryNumber}
                  onChange={(event) => onRetryNumberChange?.(event.target.value)}
                  disabled={isSubmitting || Boolean(emissionResult.pending)}
                  placeholder="Informe outro número"
                  className="rounded-none border-0 border-b-2 border-rose-300 bg-white px-3 py-2 font-mono text-slate-900 outline-none focus:border-rose-600 dark:border-rose-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={
                    !canOperateFiscal ||
                    isSubmitting ||
                    isLoadingFiscalData ||
                    isLoadingNfeNumber ||
                    Boolean(emissionResult.pending) ||
                    Boolean(fiscalPreparationError) ||
                    (environment === 1 && !productionConfirmed) ||
                    !/^\d{1,9}$/.test(retryNumber)
                  }
                  className="mt-3 rounded-xl bg-rose-700 px-4 py-2 font-black text-white transition-colors hover:bg-rose-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enviando…' : 'Tentar novamente'}
                </button>
              )}
            </div>
          )}
          {emissionResult.cStat && (
            <p className="mt-1 font-mono">
              SEFAZ cStat {emissionResult.cStat}
              {emissionResult.sefazMessage ? ` · ${emissionResult.sefazMessage}` : ''}
            </p>
          )}
          {emissionResult.validation?.errors.map((error) => (
            <p key={error} className="mt-1">
              • {error}
            </p>
          ))}
          {emissionResult.pending && (
            <p className="mt-2 font-semibold">
              Consulte a situação do documento antes de tentar novamente para evitar duplicidade.
            </p>
          )}
          {emissionResult.pending && emissionResult.documentId && onReconcile && (
            <button
              type="button"
              onClick={onReconcile}
              disabled={!canOperateFiscal || isSubmitting}
              className="mt-3 px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-black uppercase tracking-wider text-[10px] transition-all"
            >
              {isSubmitting ? 'Consultando...' : 'Consultar SEFAZ Agora'}
            </button>
          )}
        </div>
      )}

      {emissionResult?.validation?.warnings?.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {emissionResult.validation.warnings.map((warning) => (
            <p key={warning}>• {warning}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
};
