import React from 'react';
import {
  isHmlInterstateMatrixBlock,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';

export interface NfeEmissionStatusBannersProps {
  fiscalPreparationError: string | null;
  isPreparingNfe: boolean;
  preparationMessage: string;
  isSubmitting: boolean;
  isRestartingHml: boolean;
  isFiscalIssueModalOpen: boolean;
  isNfce: boolean;
  environment: 1 | 2;
  emissionResult: NfeEmissionResult | null;
  isSavingPreparation?: boolean;
  preparationSaveError?: string | null;
}

export const NfeEmissionStatusBanners: React.FC<NfeEmissionStatusBannersProps> = ({
  fiscalPreparationError,
  isPreparingNfe,
  preparationMessage,
  isSubmitting,
  isRestartingHml,
  isFiscalIssueModalOpen,
  isNfce,
  environment,
  emissionResult,
  isSavingPreparation,
  preparationSaveError,
}) => {
  return (
    <>
      {fiscalPreparationError && !isHmlInterstateMatrixBlock(fiscalPreparationError) && (
        <div
          role="alert"
          className="mx-3 mt-2 shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 sm:mx-6"
        >
          {safeFiscalIssueMessage(
            fiscalPreparationError,
            'Não foi possível carregar a preparação fiscal. Atualize os dados e tente novamente.'
          )}
        </div>
      )}

      {isPreparingNfe && (
        <div
          role="status"
          aria-live="polite"
          className="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 sm:mx-6"
        >
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          <span>{preparationMessage}</span>
        </div>
      )}

      {isSubmitting && (
        <div
          role="status"
          aria-live="polite"
          data-testid="nfe-submitting-status-banner"
          className="mx-3 mt-2 flex shrink-0 items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 sm:mx-6"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-600/30 border-t-amber-600 dark:border-amber-400/30 dark:border-t-amber-400" />
            <div>
              <p className="font-bold">
                {isRestartingHml
                  ? 'Encerrando e conferindo a tentativa anterior em homologação…'
                  : emissionResult?.pending || isFiscalIssueModalOpen
                  ? 'Consultando a SEFAZ…'
                  : `Transmitindo ${isNfce ? 'NFC-e' : 'NF-e'} para a SEFAZ (${environment === 1 ? 'Produção' : 'Homologação'})…`}
              </p>
              <p className="text-[11px] font-normal text-amber-800/80 dark:text-amber-300/80">
                Aguarde a resposta segura dos servidores da SEFAZ. Não feche a página durante o processamento.
              </p>
            </div>
          </div>
        </div>
      )}

      {(isSavingPreparation || preparationSaveError) && (
        <div
          role={preparationSaveError ? 'alert' : 'status'}
          aria-live="polite"
          data-testid="nfe-preparation-save-status"
          className="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 sm:mx-6"
        >
          {isSavingPreparation && (
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-600/30 border-t-amber-600"
            />
          )}
          <span>{preparationSaveError || 'Salvando e conferindo os dados fiscais do pedido…'}</span>
        </div>
      )}
    </>
  );
};
