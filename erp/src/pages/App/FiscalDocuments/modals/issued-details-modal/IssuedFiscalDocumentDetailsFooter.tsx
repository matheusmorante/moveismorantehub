import React from 'react';
import type { FiscalOperationDraftSummary } from '../../types/fiscalDocuments.types';

interface IssuedFiscalDocumentDetailsFooterProps {
  operationDraft?: FiscalOperationDraftSummary;
  storedXml?: string;
  hasDetailsOrDocument: boolean;
  hasXmlAvailable: boolean;
  isLoading: boolean;
  shareFile: File | null;
  shareFileError?: string;
  onReviewDraft: () => void;
  onShowXml: () => void;
  onPrintDanfe: () => void;
  onDownloadXml: () => void;
  onShareDanfe: () => void;
  onClose: () => void;
}

export const IssuedFiscalDocumentDetailsFooter: React.FC<IssuedFiscalDocumentDetailsFooterProps> = ({
  operationDraft,
  storedXml,
  hasDetailsOrDocument,
  hasXmlAvailable,
  isLoading,
  shareFile,
  shareFileError,
  onReviewDraft,
  onShowXml,
  onPrintDanfe,
  onDownloadXml,
  onShareDanfe,
  onClose,
}) => {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
      <div className="flex flex-wrap gap-2">
        {operationDraft?.sourceDocument && (
          <button
            type="button"
            onClick={onReviewDraft}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800"
          >
            {operationDraft.operation_kind === 'estorno'
              ? 'Revisar estorno fiscal'
              : 'Revisar devolução fiscal'}
          </button>
        )}
        {!operationDraft && (
          <>
            <button
              type="button"
              onClick={onShowXml}
              disabled={isLoading || !storedXml}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <i className="bi bi-code-slash" /> Ver XML
            </button>
            <button
              type="button"
              onClick={onPrintDanfe}
              disabled={!hasDetailsOrDocument || isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              <i className="bi bi-printer-fill" /> Imprimir DANFE
            </button>
            <button
              type="button"
              onClick={onDownloadXml}
              disabled={isLoading || (!hasDetailsOrDocument && !hasXmlAvailable)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-4"
            >
              <i className="bi bi-filetype-xml" /> Baixar XML
            </button>
            <button
              type="button"
              onClick={onShareDanfe}
              disabled={!shareFile}
              title={
                shareFile
                  ? 'Escolha WhatsApp no menu de compartilhamento do dispositivo'
                  : shareFileError || 'Preparando o arquivo do DANFE'
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
            >
              <i className="bi bi-share-fill" />{' '}
              {shareFile
                ? 'Compartilhar DANFE'
                : shareFileError
                ? 'DANFE indisponível'
                : 'Preparando DANFE…'}
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        Fechar
      </button>
    </footer>
  );
};
