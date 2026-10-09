import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import type {
  OrderFiscalOperationBadgeStatus,
  ReturnFiscalDocumentSummary,
} from '@/pages/utils/nfe/orderFiscalBadgeRules';

interface OrderFiscalOperationBadgeProps {
  readonly kind: 'estorno' | 'devolucao';
  readonly status?: OrderFiscalOperationBadgeStatus;
  readonly documentId?: string;
  readonly environment?: 1 | 2;
  readonly documents?: readonly ReturnFiscalDocumentSummary[];
  readonly onOpenDocument?: (documentId: string, environment: 1 | 2) => void;
}

const statusLabel: Record<OrderFiscalOperationBadgeStatus, string> = {
  issued: 'Autorizada',
  failed: 'Erro fiscal',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
  prepared: 'Preparada',
  pending: 'Em processamento',
  mixed: 'Estados mistos',
  uncertain: 'Situação incerta',
};

const openFiscalDocument = (
  document: ReturnFiscalDocumentSummary,
  onOpenDocument?: (documentId: string, environment: 1 | 2) => void,
  navigate?: (path: string) => void
) => {
  const environment: 1 | 2 = document.ambiente === 2 ? 2 : 1;
  if (onOpenDocument) {
    onOpenDocument(document.id, environment);
    return;
  }
  navigate?.(`/fiscal-documents?documentId=${encodeURIComponent(document.id)}`);
};

const ReturnFiscalBadge: React.FC<
  Omit<OrderFiscalOperationBadgeProps, 'kind'> & { status: OrderFiscalOperationBadgeStatus }
> = ({ status, documents = [], onOpenDocument }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const uniqueDocuments = [
    ...new Map(
      documents
        .filter((doc) => doc.id && doc.document_type === 'return')
        .map((doc) => [doc.id, doc])
    ).values(),
  ];
  if (uniqueDocuments.length === 0) return null;

  const count = uniqueDocuments.length;
  const title = `NFD · ${count} ${count === 1 ? 'nota fiscal' : 'notas fiscais'} de devolução · ${statusLabel[status] || 'Situação incerta'}`;
  const presentation =
    status === 'issued'
      ? { color: 'border-emerald-700 bg-emerald-600 text-white', icon: 'bi-check', iconColor: 'bg-emerald-700 text-white' }
      : status === 'cancelled'
        ? { color: 'border-red-700 bg-red-600 text-white', icon: 'bi-x', iconColor: 'bg-red-700 text-white' }
        : status === 'rejected'
          ? { color: 'border-red-700 bg-red-600 text-white', icon: 'bi-exclamation-triangle-fill', iconColor: 'bg-red-700 text-white' }
          : status === 'pending'
            ? { color: 'border-slate-500 bg-slate-500 text-white', icon: 'bi-clock', iconColor: 'bg-slate-700 text-white' }
            : status === 'mixed'
              ? { color: 'border-slate-600 bg-slate-600 text-white', icon: 'bi-layers-fill', iconColor: 'bg-slate-800 text-white' }
              : { color: 'border-orange-700 bg-orange-500 text-white', icon: 'bi-exclamation-triangle-fill', iconColor: 'bg-orange-700 text-white' };

  return (
    <>
      <button
        type="button"
        title={`${title} · Abrir detalhes`}
        aria-label={`${title} · Abrir detalhes`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`relative inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-1.5 text-[9px] font-black leading-none ${presentation.color} cursor-pointer hover:ring-2 hover:ring-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        NFD
        <span
          aria-hidden="true"
          className="absolute -left-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-white bg-slate-800 px-0.5 text-[8px] font-bold text-white dark:border-slate-900"
        >
          {count}
        </span>
        <span
          aria-hidden="true"
          className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white dark:border-slate-900 ${presentation.iconColor}`}
        >
          <i className={`bi ${presentation.icon} text-[9px]`} />
        </span>
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setIsOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-fiscal-documents-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 id="return-fiscal-documents-title" className="text-sm font-bold text-slate-900 dark:text-white">
                  Notas fiscais de devolução · {count}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">{statusLabel[status] || 'Situação incerta'}</p>
              </div>
              <button
                type="button"
                aria-label="Fechar detalhes das notas de devolução"
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIsOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </header>
            <div className="max-h-[calc(85vh-64px)] space-y-3 overflow-y-auto p-4">
              {uniqueDocuments.map((document) => {
                const documentStatus = String(document.status || 'Situação incerta');
                const amount =
                  document.valor_total == null ? Number.NaN : Number(document.valor_total);
                const model = document.modelo === '65' ? 'NFC-e 65' : document.modelo === '55' ? 'NF-e 55' : `Modelo ${document.modelo || '—'}`;
                const returnOrderCode = document.returnOrderCode || document.order_id;
                return (
                  <article key={document.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                          NFD {document.numero_nfe || '—'} · Série {document.serie || '—'}
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {model} · {document.ambiente === 2 ? 'Homologação' : 'Produção'} · {documentStatus}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {document.issuedAt ? 'Autorização' : 'Registro no ERP'}:{' '}
                        {formatToBRDate(document.issuedAt || document.created_at)}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
                      <div>
                        <dt className="text-slate-500">Pedido de devolução</dt>
                        <dd>
                          <button
                            type="button"
                            className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/sales-order/edit/${encodeURIComponent(document.order_id)}`);
                            }}
                          >
                            #{returnOrderCode}
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Valor</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {Number.isFinite(amount) ? formatCurrency(amount) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Quantidade</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {typeof document.itemQuantity === 'number'
                            ? `${document.itemQuantity.toLocaleString('pt-BR')} unidades`
                            : '—'}
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-blue-200 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/40"
                      onClick={() => {
                        setIsOpen(false);
                        openFiscalDocument(document, onOpenDocument, navigate);
                      }}
                    >
                      <i className="bi bi-file-earmark-text" />
                      Abrir XML/DANFE e ações fiscais
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
};

export const OrderFiscalOperationBadge: React.FC<OrderFiscalOperationBadgeProps> = (props) => {
  const navigate = useNavigate();
  if (props.kind === 'devolucao') {
    if (!props.status || !props.documents?.length) return null;
    return <ReturnFiscalBadge status={props.status} documents={props.documents} onOpenDocument={props.onOpenDocument} />;
  }

  const { status, documentId, environment = 1, onOpenDocument } = props;
  if (!status) return null;

  const failed = status === 'failed';
  const rejected = status === 'rejected';
  const cancelled = status === 'cancelled';
  const prepared = status === 'prepared';
  const pending = status === 'pending';
  const estornoWaiting = prepared || pending;
  const label = props.kind === 'estorno' ? 'NFE' : 'NFD';
  const documentName = props.kind === 'estorno' ? 'de estorno' : 'de devolução';
  const environmentLabel = environment === 2 ? ' em homologação' : '';
  const title = failed
    ? `Nota fiscal ${documentName} com erro${environmentLabel}`
    : rejected
      ? `Nota fiscal ${documentName} rejeitada${environmentLabel}`
      : cancelled
        ? `Nota fiscal ${documentName} cancelada${environmentLabel}`
        : prepared
          ? `Nota fiscal ${documentName} preparada para revisão${environmentLabel}`
          : pending
            ? `Nota fiscal ${documentName} aguardando confirmação da SEFAZ${environmentLabel}`
            : `Nota fiscal ${documentName} emitida${environmentLabel}`;
  const colorClass = cancelled
    ? 'border-red-700 bg-red-600 text-white hover:bg-red-700'
    : rejected && props.kind === 'estorno'
      ? 'border-amber-700 bg-amber-500 text-white hover:bg-amber-600'
      : failed || rejected
        ? 'border-red-700 bg-red-600 text-white hover:bg-red-700'
        : estornoWaiting
          ? 'border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700'
          : prepared
            ? 'border-amber-700 bg-amber-500 text-white hover:bg-amber-600'
            : pending
              ? 'border-blue-700 bg-blue-600 text-white hover:bg-blue-700'
              : 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700';
  const className = `relative inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-1.5 text-[9px] font-black leading-none ${colorClass}`;
  const iconClass = cancelled
    ? 'bi-x'
    : rejected && props.kind === 'estorno'
      ? 'bi-exclamation-triangle-fill'
      : failed || rejected
        ? 'bi-exclamation'
        : estornoWaiting || prepared
          ? 'bi-clock'
          : pending
            ? 'bi-arrow-repeat'
            : 'bi-check';
  const iconColorClass = cancelled
    ? 'bg-red-700 text-white'
    : rejected && props.kind === 'estorno'
      ? 'bg-amber-700 text-white'
      : failed || rejected
        ? 'bg-red-700 text-white'
        : estornoWaiting
          ? 'bg-indigo-700 text-white'
          : prepared
            ? 'bg-amber-700 text-white'
            : pending
              ? 'bg-blue-700 text-white'
              : 'bg-emerald-700 text-white';
  const contents = (
    <>
      {label}
      <span
        aria-hidden="true"
        className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white dark:border-slate-900 ${iconColorClass}`}
      >
        <i className={`bi ${iconClass} text-[9px]`} />
      </span>
    </>
  );

  if (!documentId) {
    return (
      <span title={title} aria-label={title} className={className}>
        {contents}
      </span>
    );
  }
  return (
    <button
      type="button"
      title={`${title} · Abrir documento fiscal`}
      aria-label={`${title} · Abrir documento fiscal`}
      className={`${className} cursor-pointer hover:ring-2 hover:ring-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
      onClick={(event) => {
        event.stopPropagation();
        if (onOpenDocument) onOpenDocument(documentId, environment);
        else navigate(`/fiscal-documents?documentId=${encodeURIComponent(documentId)}`);
      }}
    >
      {contents}
    </button>
  );
};
