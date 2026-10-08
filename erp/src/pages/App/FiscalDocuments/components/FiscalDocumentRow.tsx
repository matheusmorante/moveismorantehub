import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import type {
  CancellationEligibility,
  FiscalDocumentDetails,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';
import { FiscalDocumentStatusBadge } from './FiscalDocumentStatusBadge';
import { FiscalDocumentRowActions } from './FiscalDocumentRowActions';
import { FiscalDocumentDetailsRow } from './FiscalDocumentDetailsRow';
import { getCancellationDeadlineLabel } from '../utils/fiscalFormatters';

export interface FiscalDocumentRowProps {
  document: NfeDocumentRecord;
  allDocuments: NfeDocumentRecord[];
  orderNumber?: number;
  eligibility?: CancellationEligibility;
  isDetailsOpen: boolean;
  isDetailsLoading: boolean;
  details?: FiscalDocumentDetails | null;
  canOperateFiscal: boolean;
  retryingHmlDocumentId: string | null;
  onViewDetails: () => void;
  onToggleDetails: () => void;
  onPrintDanfe: () => void;
  onDownloadXml: () => void;
  onConsultSituation: () => void;
  onOpenCce: () => void;
  onOpenFiscalTreatment: () => void;
  onPrepareLinkedOperation: () => void;
  onRetryHml: () => void;
}

export const FiscalDocumentRow: React.FC<FiscalDocumentRowProps> = ({
  document,
  allDocuments,
  orderNumber,
  eligibility,
  isDetailsOpen,
  isDetailsLoading,
  details,
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
  const navigate = useNavigate();
  const deadlineLabel = getCancellationDeadlineLabel(document, eligibility);

  return (
    <>
      <tr className="align-middle transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
        <td className="whitespace-nowrap px-3 py-2">
          <FiscalDocumentStatusBadge status={document.status} />
          {document.status === 'abandoned' &&
            (() => {
              const successor = allDocuments.find(
                (candidate) => candidate.supersedes_document_id === document.id
              );
              return successor ? (
                <span className="mt-1 block whitespace-normal text-[9px] text-slate-500">
                  Nova tentativa criada: #{String(successor.numero_nfe).padStart(6, '0')}
                </span>
              ) : null;
            })()}
        </td>
        <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">
          <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {document.modelo === '65' ? '65' : '55'}
          </span>
          #{String(document.numero_nfe).padStart(6, '0')}{' '}
          <span className="font-normal text-slate-500">S{document.serie}</span>
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
          {formatToBRDate(document.created_at)}
        </td>
        <td className="max-w-56 px-3 py-2">
          <div
            className="truncate font-medium text-slate-800 dark:text-slate-100"
            title={document.destinatario_nome || ''}
          >
            {document.destinatario_nome || 'Consumidor final'}
          </div>
          <div className="text-[10px] text-slate-500">
            {document.destinatario_documento || '—'}
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-2">
          {document.order_id ? (
            <button
              type="button"
              onClick={() => navigate(`/sales-order/edit/${document.order_id}`)}
              className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
              title="Abrir pedido de origem"
            >
              #{orderNumber || 'Pedido'}{' '}
              <i className="bi bi-box-arrow-up-right ml-0.5 text-[9px]" />
            </button>
          ) : (
            <span className="text-slate-400">Sem vínculo</span>
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">
          {formatCurrency(document.valor_total || 0)}
        </td>
        <td className="whitespace-nowrap px-3 py-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
              document.ambiente === 1
                ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
            }`}
          >
            {document.ambiente === 1 ? 'Produção' : 'Homologação'}
          </span>
        </td>
        <td
          className="max-w-64 px-3 py-2 text-[10px] font-normal text-slate-500"
          title={document.motivo_status || ''}
        >
          <span className="block truncate">{document.motivo_status || '—'}</span>
          {document.supersedes_document_id && (
            <span
              className="block truncate text-[9px]"
              title={document.supersedes_document_id}
            >
              Substitui tentativa {document.supersedes_document_id.slice(0, 8)}…
            </span>
          )}
          {deadlineLabel && (
            <span className="block truncate text-[9px]">{deadlineLabel}</span>
          )}
          {eligibility?.action === 'pending' && (
            <span
              className="block truncate text-[9px] font-semibold text-amber-700 dark:text-amber-300"
              title={eligibility.reason || ''}
            >
              Cancelamento em processamento
            </span>
          )}
          {eligibility?.action === 'reconcile' && (
            <span
              className="block truncate text-[9px] font-semibold text-amber-700 dark:text-amber-300"
              title={eligibility.reason || ''}
            >
              Situação do cancelamento não confirmada · Consultar SEFAZ
            </span>
          )}
          {eligibility &&
            !eligibility.canProceed &&
            !['pending', 'reconcile'].includes(eligibility.action) && (
              <span
                className="block truncate text-[9px]"
                title={eligibility.reason || ''}
              >
                {eligibility.reason || 'Cancelamento indisponível'}
              </span>
            )}
        </td>
        <td className="px-3 py-2 text-right">
          <FiscalDocumentRowActions
            document={document}
            isDetailsOpen={isDetailsOpen}
            canOperateFiscal={canOperateFiscal}
            cancellationEligibility={eligibility}
            retryingHmlDocumentId={retryingHmlDocumentId}
            onViewDetails={onViewDetails}
            onToggleDetails={onToggleDetails}
            onPrintDanfe={onPrintDanfe}
            onDownloadXml={onDownloadXml}
            onConsultSituation={onConsultSituation}
            onOpenCce={onOpenCce}
            onOpenFiscalTreatment={onOpenFiscalTreatment}
            onPrepareLinkedOperation={onPrepareLinkedOperation}
            onRetryHml={onRetryHml}
          />
        </td>
      </tr>

      {isDetailsOpen && (
        <FiscalDocumentDetailsRow
          document={document}
          isLoading={isDetailsLoading}
          details={details}
        />
      )}
    </>
  );
};
