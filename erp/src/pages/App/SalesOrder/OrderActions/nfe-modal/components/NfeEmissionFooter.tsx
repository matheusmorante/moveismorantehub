import React from 'react';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import {
  getFiscalIssuePresentation,
  isHmlInterstateMatrixBlock,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';

export interface NfeEmissionFooterProps {
  invoiceTotal: number;
  environment: 1 | 2;
  isNfce: boolean;
  canOperateFiscal: boolean;
  isSubmitting: boolean;
  isLoadingFiscalData: boolean;
  isLoadingCustomerType: boolean;
  fiscalPreparationError: string | null;
  emissionResult: NfeEmissionResult | null;
  productionConfirmed: boolean;
  onClose: () => void;
  onEmit: (productionConfirmed: boolean, isRetry: boolean) => void;
  onPrintDanfe: () => void;
  onOpenFiscalIssue?: () => void;
  onTransmissionEnabled?: () => void;
}

export const NfeEmissionFooter: React.FC<NfeEmissionFooterProps> = ({
  invoiceTotal,
  environment,
  isNfce,
  canOperateFiscal,
  isSubmitting,
  isLoadingFiscalData,
  isLoadingCustomerType,
  fiscalPreparationError,
  emissionResult,
  productionConfirmed,
  onClose,
  onEmit,
  onPrintDanfe,
  onOpenFiscalIssue,
  onTransmissionEnabled,
}) => {
  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(invoiceTotal);

  const isUnapprovedInterstateMatrix = isHmlInterstateMatrixBlock(fiscalPreparationError);
  const hasBlockingPreparationFailure =
    Boolean(fiscalPreparationError) && !isUnapprovedInterstateMatrix;
  const isEmitDisabled =
    !canOperateFiscal ||
    isSubmitting ||
    isLoadingFiscalData ||
    isLoadingCustomerType ||
    hasBlockingPreparationFailure;

  React.useLayoutEffect(() => {
    if (!isEmitDisabled && !isUnapprovedInterstateMatrix) onTransmissionEnabled?.();
  }, [isEmitDisabled, isUnapprovedInterstateMatrix, onTransmissionEnabled]);

  const isSpecialHmlConflictState = Boolean(
    emissionResult?.numberConflict ||
      emissionResult?.hmlConfirmedNotFound ||
      emissionResult?.hmlNewEmissionRequired
  );
  const emissionIssue =
    emissionResult && !emissionResult.success && !emissionResult.pending
      ? getFiscalIssuePresentation(emissionResult)
      : null;
  const fiscalIssueMessage = emissionIssue
    ? `${emissionIssue.title}. ${emissionIssue.description}`
    : fiscalPreparationError
      ? safeFiscalIssueMessage(
          fiscalPreparationError,
          'Não foi possível preparar os dados fiscais. Consulte os detalhes do aviso fiscal.'
        )
      : !canOperateFiscal
        ? 'Seu perfil não pode operar documentos fiscais.'
        : null;

  return (
    <footer className="px-3 py-2 sm:px-6 sm:py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
      <div className="flex items-center justify-between sm:justify-start gap-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Total da Nota:{' '}
          <strong className="text-sm font-black text-slate-800 dark:text-slate-100">
            {formattedTotal}
          </strong>
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Fechar
        </button>

        {fiscalIssueMessage && (
          <div
            data-testid="nfe-fiscal-footer-error"
            role="alert"
            aria-live="assertive"
            className="flex min-w-0 max-w-full sm:max-w-[36rem] items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <i className="bi bi-exclamation-triangle-fill mt-0.5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 whitespace-normal break-words text-xs leading-5">
              {fiscalIssueMessage}
            </p>
            {onOpenFiscalIssue && (emissionIssue || fiscalPreparationError) && (
              <button
                type="button"
                aria-label="Ver detalhes do aviso fiscal"
                aria-haspopup="dialog"
                title="Ver detalhes do aviso fiscal"
                onClick={onOpenFiscalIssue}
                className="shrink-0 text-xs font-bold underline underline-offset-2 hover:text-rose-950 dark:hover:text-white"
              >
                Detalhes
              </button>
            )}
          </div>
        )}

        {!emissionResult?.success && !emissionResult?.pending ? (
          isSpecialHmlConflictState ? null : (
            <>
              <button
                type="button"
                data-testid="nfe-emit-button"
                onClick={() => onEmit(productionConfirmed, false)}
                disabled={isEmitDisabled}
                className="px-5 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>
                      Transmitindo {environment === 1 ? 'em Produção' : 'em Homologação'}...
                    </span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-arrow-up-fill" />
                    <span>
                      {emissionResult &&
                      getFiscalIssuePresentation(emissionResult).action === 'retry-safely'
                        ? 'Tentar novamente'
                        : `Emitir ${isNfce ? 'NFC-e' : 'NF-e'} em ${environment === 1 ? 'Produção' : 'Homologação'}`}
                    </span>
                  </>
                )}
              </button>
            </>
          )
        ) : emissionResult?.pending ? null : (
          <button
            type="button"
            onClick={onPrintDanfe}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
          >
            <i className="bi bi-printer-fill" />
            <span>Imprimir DANFE</span>
          </button>
        )}
      </div>
    </footer>
  );
};

export default NfeEmissionFooter;
