import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import type { FiscalDocumentRowProps } from './FiscalDocumentRow';
import { FiscalDocumentStatusBadge } from './FiscalDocumentStatusBadge';
import { FiscalDocumentRowActions } from './FiscalDocumentRowActions';
import { FiscalDocumentDetailsRow } from './FiscalDocumentDetailsRow';
import { getCancellationDeadlineLabel } from '../utils/fiscalFormatters';

export const FiscalDocumentCard: React.FC<FiscalDocumentRowProps> = ({
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
  const successor = allDocuments.find(
    (candidate) => candidate.supersedes_document_id === document.id
  );
  const environmentClass =
    document.ambiente === 1
      ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
      : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <FiscalDocumentStatusBadge status={document.status} />
          {document.status === 'abandoned' && successor && (
            <p className="text-[11px] text-slate-500">
              Nova tentativa criada: #{String(successor.numero_nfe).padStart(6, '0')}
            </p>
          )}
          <h2 className="break-words text-sm font-bold text-slate-800 dark:text-slate-100">
            {document.modelo === '65' ? 'NFC-e' : 'NF-e'} #
            {String(document.numero_nfe).padStart(6, '0')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Série {document.serie || '—'} · {formatToBRDate(document.created_at)}
          </p>
        </div>
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
      </header>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800 md:grid-cols-3">
        <div className="col-span-2 min-w-0 md:col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Destinatário
          </p>
          <p className="mt-0.5 break-words font-medium text-slate-800 dark:text-slate-100">
            {document.destinatario_nome || 'Consumidor final'}
          </p>
          <p className="mt-0.5 break-words text-[11px] text-slate-500">
            {document.destinatario_documento || '—'}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pedido</p>
          {document.order_id ? (
            <button
              type="button"
              onClick={() => navigate(`/sales-order/edit/${document.order_id}`)}
              className="mt-0.5 inline-flex min-h-9 items-center font-semibold text-blue-700 hover:underline dark:text-blue-300"
              title="Abrir pedido de origem"
            >
              #{orderNumber || 'Pedido'}
              <i className="bi bi-box-arrow-up-right ml-1 text-[10px]" aria-hidden="true" />
            </button>
          ) : (
            <p className="mt-0.5 text-slate-500">Sem vínculo</p>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Ambiente
          </p>
          <span
            className={`mt-1 inline-flex rounded px-2 py-1 text-[10px] font-semibold ${environmentClass}`}
          >
            {document.ambiente === 1 ? 'Produção' : 'Homologação'}
          </span>
        </div>

        <div className="col-span-2 md:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
            {formatCurrency(document.valor_total || 0)}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Último retorno
        </p>
        <p className="mt-1 max-h-20 overflow-y-auto text-slate-600 dark:text-slate-300 [overflow-wrap:anywhere]">
          {document.motivo_status || '—'}
        </p>
        {document.supersedes_document_id && (
          <p className="mt-1 break-words text-[11px] text-slate-500">
            Substitui tentativa {document.supersedes_document_id.slice(0, 8)}…
          </p>
        )}
        {deadlineLabel && <p className="mt-1 text-[11px] text-slate-500">{deadlineLabel}</p>}
        {eligibility?.action === 'pending' && (
          <p className="mt-1 font-semibold text-amber-700 dark:text-amber-300">
            Cancelamento em processamento
          </p>
        )}
        {eligibility?.action === 'reconcile' && (
          <p className="mt-1 font-semibold text-amber-700 dark:text-amber-300">
            Situação do cancelamento não confirmada · Consultar SEFAZ
          </p>
        )}
        {eligibility &&
          !eligibility.canProceed &&
          !['pending', 'reconcile'].includes(eligibility.action) && (
            <p className="mt-1 text-slate-500">
              {eligibility.reason || 'Cancelamento indisponível'}
            </p>
          )}
      </div>

      {isDetailsOpen && (
        <FiscalDocumentDetailsRow
          document={document}
          isLoading={isDetailsLoading}
          details={details}
          asCard
        />
      )}
    </article>
  );
};
