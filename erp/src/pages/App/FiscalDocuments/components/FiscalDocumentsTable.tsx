import React from 'react';
import type {
  CancellationEligibility,
  FiscalDocumentDetails,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';
import { FiscalDocumentRow } from './FiscalDocumentRow';

interface FiscalDocumentsTableProps {
  documents: NfeDocumentRecord[];
  allDocuments: NfeDocumentRecord[];
  loading: boolean;
  orderNumbers: Record<string, number>;
  cancellationEligibility: Record<string, CancellationEligibility>;
  detailsDocumentId: string | null;
  detailsLoadingId: string | null;
  fiscalDetails: Record<string, FiscalDocumentDetails>;
  canOperateFiscal: boolean;
  retryingHmlDocumentId: string | null;
  onViewDetails: (doc: NfeDocumentRecord) => void;
  onToggleDetails: (doc: NfeDocumentRecord) => void;
  onPrintDanfe: (doc: NfeDocumentRecord) => void;
  onDownloadXml: (doc: NfeDocumentRecord) => void;
  onConsultSituation: (doc: NfeDocumentRecord) => void;
  onOpenCce: (doc: NfeDocumentRecord) => void;
  onOpenFiscalTreatment: (doc: NfeDocumentRecord) => void;
  onPrepareLinkedOperation: (doc: NfeDocumentRecord) => void;
  onRetryHml: (doc: NfeDocumentRecord) => void;
}

export const FiscalDocumentsTable: React.FC<FiscalDocumentsTableProps> = ({
  documents,
  allDocuments,
  loading,
  orderNumbers,
  cancellationEligibility,
  detailsDocumentId,
  detailsLoadingId,
  fiscalDetails,
  canOperateFiscal,
  retryingHmlDocumentId,
  onViewDetails,
  onToggleDetails,
  onPrintDanfe,
  onDownloadXml,
  onConsultSituation,
  onOpenCce,
  onOpenFiscalTreatment,
  onPrepareLinkedOperation,
  onRetryHml,
}) => {
  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-xs font-bold animate-pulse">
        Carregando documentos fiscais...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center text-xl">
          <i className="bi bi-file-earmark-x" />
        </div>
        <p className="text-xs font-bold text-slate-500">
          Nenhum documento fiscal encontrado com os filtros atuais.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Documento</th>
            <th className="px-3 py-2">Emissão</th>
            <th className="px-3 py-2">Destinatário</th>
            <th className="px-3 py-2">Pedido</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2">Ambiente</th>
            <th className="px-3 py-2">Último retorno</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[11px] dark:divide-slate-800/60">
          {documents.map((doc) => (
            <FiscalDocumentRow
              key={doc.id}
              document={doc}
              allDocuments={allDocuments}
              orderNumber={doc.order_id ? orderNumbers[doc.order_id] : undefined}
              eligibility={cancellationEligibility[doc.id]}
              isDetailsOpen={detailsDocumentId === doc.id}
              isDetailsLoading={detailsLoadingId === doc.id}
              details={fiscalDetails[doc.id]}
              canOperateFiscal={canOperateFiscal}
              retryingHmlDocumentId={retryingHmlDocumentId}
              onViewDetails={() => onViewDetails(doc)}
              onToggleDetails={() => onToggleDetails(doc)}
              onPrintDanfe={() => onPrintDanfe(doc)}
              onDownloadXml={() => onDownloadXml(doc)}
              onConsultSituation={() => onConsultSituation(doc)}
              onOpenCce={() => onOpenCce(doc)}
              onOpenFiscalTreatment={() => onOpenFiscalTreatment(doc)}
              onPrepareLinkedOperation={() => onPrepareLinkedOperation(doc)}
              onRetryHml={() => onRetryHml(doc)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
