import type React from 'react';
import { useEffect } from 'react';
import { FiscalIssueCard } from '@/pages/App/shared/components/FiscalIssueCard';
import {
  getFiscalIssuePresentation,
  getFiscalIssueTechnicalDetails,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';

export interface NfeFiscalIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  emissionResult: NfeEmissionResult | null;
  environment: 1 | 2;
  productionConfirmed: boolean;
  retryNumber: string;
  onRetryNumberChange?: (val: string) => void;
  onRetry?: () => void;
  canOperateFiscal: boolean;
  isSubmitting: boolean;
  isLoadingFiscalData: boolean;
  fiscalPreparationError: string | null;
  onReconcile?: () => void;
  onAbandonHmlTlsAttempt?: () => void;
  onStartFreshHmlEmission?: () => void;
  onCorrectFiscalData?: () => void;
}

export const NfeFiscalIssueModal: React.FC<NfeFiscalIssueModalProps> = ({
  isOpen,
  onClose,
  emissionResult,
  environment,
  productionConfirmed,
  retryNumber,
  onRetryNumberChange,
  onRetry,
  canOperateFiscal,
  isSubmitting,
  isLoadingFiscalData,
  fiscalPreparationError,
  onReconcile,
  onAbandonHmlTlsAttempt,
  onStartFreshHmlEmission,
  onCorrectFiscalData,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !emissionResult || emissionResult.success) {
    return null;
  }

  const issueCopy = getFiscalIssuePresentation(emissionResult);
  if (!issueCopy) {
    return null;
  }

  const technicalDetails = getFiscalIssueTechnicalDetails(emissionResult);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fiscal-issue-modal-title"
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="fixed inset-0 -z-10" aria-hidden="true" onClick={onClose} />
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <i
              className={`bi bi-exclamation-triangle-fill text-base ${
                issueCopy.tone === 'error' ? 'text-rose-500' : 'text-amber-500'
              }`}
            />
            <h3
              id="fiscal-issue-modal-title"
              className="text-sm font-black text-slate-800 dark:text-slate-100"
            >
              Aviso da Nota Fiscal
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar aviso"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar">
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
        </div>
      </div>
    </div>
  );
};

export default NfeFiscalIssueModal;
