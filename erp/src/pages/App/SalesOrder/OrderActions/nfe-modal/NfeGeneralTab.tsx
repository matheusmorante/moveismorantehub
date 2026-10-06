import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import {
  getFiscalIssuePresentation,
  getFiscalIssueTechnicalDetails,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import { NfeOrderSummary } from './NfeOrderSummary';
import {
  FiscalIssueCard,
  type FiscalIssueTechnicalDetails,
} from '@/pages/App/shared/components/FiscalIssueCard';

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
  fiscalPreparationError: string | null;
  onReconcile?: () => void;
  onAbandonHmlTlsAttempt?: () => void;
  onStartFreshHmlEmission?: () => void;
  onCorrectFiscalData?: () => void;
  onClose?: () => void;
}

function getIssueCopy(result: NfeEmissionResult) {
  return getFiscalIssuePresentation(result);
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
  fiscalPreparationError,
  onReconcile,
  onAbandonHmlTlsAttempt,
  onStartFreshHmlEmission,
  onCorrectFiscalData,
  onClose,
}) => {
  const issueCopy = emissionResult && !emissionResult.success ? getIssueCopy(emissionResult) : null;
  const technicalDetails: FiscalIssueTechnicalDetails | undefined = emissionResult
    ? getFiscalIssueTechnicalDetails(emissionResult)
    : undefined;

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
                value={
                  isLocked && emissionResult?.nfeNumber
                    ? String(emissionResult.nfeNumber)
                    : numberPreview
                }
                readOnly={isLocked || isSubmitting}
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
          <p className="mt-1">
            {safeFiscalIssueMessage(
              fiscalPreparationError,
              'Não foi possível carregar a preparação fiscal. Atualize os dados e tente novamente.'
            )}
          </p>
        </div>
      )}

      {emissionResult && !emissionResult.success && issueCopy && (
        <FiscalIssueCard
          tone={issueCopy.tone}
          title={issueCopy.title}
          description={issueCopy.description}
          nextStep={issueCopy.nextStep}
          technicalDetails={technicalDetails}
          onClose={onClose}
        >
          {emissionResult.fiscalMismatchFields?.length ? (
            <div data-testid="nfe-fiscal-mismatch-fields">
              <p className="font-bold">Encontramos esta alteração:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {emissionResult.fiscalMismatchFields.map((mismatch) => (
                  <li key={mismatch.field}>
                    <strong>{mismatch.field}</strong>
                    {mismatch.snapshotValue !== undefined &&
                      mismatch.currentValue !== undefined && (
                        <span className="mt-0.5 block">
                          Antes: {mismatch.snapshotValue || '(vazio)'} · Agora:{' '}
                          {mismatch.currentValue || '(vazio)'}
                        </span>
                      )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {issueCopy.action === 'configure-certificate' && (
            <a
              href="/settings/fiscal"
              className="inline-flex rounded-xl bg-blue-700 px-4 py-2 font-black text-white transition-colors hover:bg-blue-800"
            >
              Verificar certificado
            </a>
          )}
          {environment === 2 &&
            issueCopy.action === 'start-fresh-hml' &&
            emissionResult.hmlCanAbandonTlsFailure &&
            onAbandonHmlTlsAttempt && (
              <button
                type="button"
                data-testid="nfe-start-fresh-hml-emission"
                onClick={onAbandonHmlTlsAttempt}
                disabled={
                  !canOperateFiscal ||
                  isSubmitting ||
                  isLoadingFiscalData ||
                  isLoadingNfeNumber ||
                  Boolean(fiscalPreparationError)
                }
                className="rounded-xl bg-blue-700 px-4 py-2 font-black text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Iniciando nova tentativa…' : 'Iniciar nova tentativa fiscal'}
              </button>
            )}
          {environment === 2 &&
            issueCopy.action === 'start-fresh-hml' &&
            emissionResult.hmlNewEmissionRequired &&
            onStartFreshHmlEmission && (
              <button
                type="button"
                data-testid="nfe-start-fresh-hml-emission"
                onClick={onStartFreshHmlEmission}
                disabled={
                  !canOperateFiscal ||
                  isSubmitting ||
                  isLoadingFiscalData ||
                  isLoadingNfeNumber ||
                  Boolean(fiscalPreparationError)
                }
                className="rounded-xl bg-blue-700 px-4 py-2 font-black text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Preparando nova tentativa…' : 'Iniciar nova tentativa fiscal'}
              </button>
            )}
          {emissionResult.numberConflict && (
            <div className="rounded-xl border border-rose-300 bg-white/70 p-3 dark:border-rose-800 dark:bg-slate-950/50">
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
          {emissionResult.validation?.errors.map((error) => (
            <p key={error} className="mt-1">
              • {safeFiscalIssueMessage(error, 'Há dados fiscais que precisam de correção.')}
            </p>
          ))}
          {issueCopy.action === 'correct-fiscal-data' && onCorrectFiscalData && (
            <button
              type="button"
              onClick={onCorrectFiscalData}
              disabled={!canOperateFiscal || isSubmitting}
              className="rounded-xl bg-rose-700 px-4 py-2 font-black text-white transition-colors hover:bg-rose-800 disabled:opacity-50"
            >
              Corrigir dados fiscais
            </button>
          )}
          {issueCopy.action === 'consult' &&
            (emissionResult.documentId ||
              emissionResult.emissionRequestId ||
              emissionResult.reservationRecoveryRequired) &&
            onReconcile && (
              <button
                type="button"
                onClick={onReconcile}
                disabled={!canOperateFiscal || isSubmitting}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-black transition-all"
              >
                {isSubmitting
                  ? emissionResult.reservationRecoveryRequired
                    ? 'Retomando reserva…'
                    : 'Consultando a SEFAZ…'
                  : emissionResult.reservationRecoveryRequired
                    ? 'Retomar reserva existente'
                    : emissionResult.databaseReason === 'ALREADY_ACTIVE_FISCAL_ATTEMPT'
                      ? 'Consultar tentativa em andamento'
                      : 'Consultar SEFAZ agora'}
              </button>
            )}
          {environment === 2 &&
            issueCopy.action === 'retransmit-same-document' &&
            emissionResult.hmlConfirmedNotFound &&
            !emissionResult.pending &&
            emissionResult.documentId &&
            onRetry && (
              <button
                type="button"
                data-testid="nfe-retry-same-document"
                onClick={onRetry}
                disabled={
                  !canOperateFiscal ||
                  isSubmitting ||
                  isLoadingFiscalData ||
                  Boolean(fiscalPreparationError)
                }
                className="rounded-xl bg-blue-700 px-4 py-2 font-black text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Retransmitindo…'
                  : `Retransmitir a mesma ${emissionResult.model === '55' ? 'NF-e' : 'NFC-e'}`}
              </button>
            )}
        </FiscalIssueCard>
      )}

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
