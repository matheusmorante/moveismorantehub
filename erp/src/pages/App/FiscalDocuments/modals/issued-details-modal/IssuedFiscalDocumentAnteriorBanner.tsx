import React from 'react';
import type { FiscalDocumentEmissionHistoryRecord } from '../../types/fiscalDocuments.types';

interface IssuedFiscalDocumentAnteriorBannerProps {
  currentActiveEmission: FiscalDocumentEmissionHistoryRecord;
  onReturnToActive: (documentId: string) => void;
}

export const IssuedFiscalDocumentAnteriorBanner: React.FC<IssuedFiscalDocumentAnteriorBannerProps> = ({
  currentActiveEmission,
  onReturnToActive,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 sm:px-6">
      <div className="flex items-center gap-2">
        <i className="bi bi-info-circle-fill text-amber-600 dark:text-amber-400" />
        <span>
          Visualizando <strong>emissão anterior</strong> desta venda.
        </span>
      </div>
      <button
        type="button"
        onClick={() => onReturnToActive(currentActiveEmission.id)}
        className="flex items-center gap-1 font-bold text-amber-800 underline transition hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100"
      >
        <span>Voltar à nota vigente (NF-e nº {currentActiveEmission.numero_nfe || '—'})</span>
        <i className="bi bi-arrow-right" />
      </button>
    </div>
  );
};
