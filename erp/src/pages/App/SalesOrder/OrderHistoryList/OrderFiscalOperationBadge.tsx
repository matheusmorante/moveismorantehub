import React from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  OrderFiscalOperationBadgeStatus,
  ReturnFiscalDocumentSummary,
} from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { resolveReturnFiscalBadgeStatus } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import {
  orderBadgeIndicatorClass,
  orderBadgeIndicatorColorClass,
  orderBadgeIndicatorIconClass,
} from './orderBadgeStyles';

interface OrderFiscalOperationBadgeProps {
  readonly kind: 'estorno' | 'devolucao';
  readonly status?: OrderFiscalOperationBadgeStatus;
  readonly documentId?: string;
  readonly draftId?: string;
  readonly environment?: 1 | 2;
  readonly documents?: readonly ReturnFiscalDocumentSummary[];
  readonly onOpenDocument?: (documentId: string, environment: 1 | 2) => void;
  readonly onOpenDraft?: (draftId: string) => void;
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
  Omit<OrderFiscalOperationBadgeProps, 'kind' | 'status'>
> = ({ documents = [], onOpenDocument }) => {
  const navigate = useNavigate();
  const uniqueDocuments = [
    ...new Map(
      documents
        .filter((doc) => doc.id && doc.document_type === 'return')
        .map((doc) => [doc.id, doc])
    ).values(),
  ].sort((a, b) => {
    const createdAtOrder = String(a.created_at || a.issuedAt || '').localeCompare(
      String(b.created_at || b.issuedAt || '')
    );
    return (
      createdAtOrder ||
      Number(a.numero_nfe || 0) - Number(b.numero_nfe || 0) ||
      a.id.localeCompare(b.id)
    );
  });
  if (uniqueDocuments.length === 0) return null;

  const presentationFor = (status: OrderFiscalOperationBadgeStatus) =>
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
      <div className="flex flex-wrap items-center gap-1">
        {uniqueDocuments.map((document, index) => {
          const documentStatus = resolveReturnFiscalBadgeStatus([document]) || 'uncertain';
          const presentation = presentationFor(documentStatus);
          const sequenceLabel = `NFD${index + 1}`;
          const title = `${sequenceLabel} · ${document.numero_nfe || 'sem número'} · ${
            statusLabel[documentStatus] || 'Situação incerta'
          }`;
          return (
            <button
              key={document.id}
              type="button"
              title={`${title} · Abrir detalhes`}
              aria-label={`${title} · Abrir detalhes`}
              className={`relative inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-3.5 text-[9px] font-black leading-none ${presentation.color} cursor-pointer hover:ring-2 hover:ring-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
              onClick={(event) => {
                event.stopPropagation();
                openFiscalDocument(document, onOpenDocument, navigate);
              }}
            >
              <span>{sequenceLabel}</span>
              <span
                aria-hidden="true"
                className={`${orderBadgeIndicatorClass} ${orderBadgeIndicatorColorClass(presentation.icon, presentation.iconColor)}`}
              >
                <i className={`bi ${presentation.icon} ${orderBadgeIndicatorIconClass}`} />
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export const OrderFiscalOperationBadge: React.FC<OrderFiscalOperationBadgeProps> = (props) => {
  const navigate = useNavigate();
  if (props.kind === 'devolucao') {
    if (!props.documents?.length) return null;
    return <ReturnFiscalBadge documents={props.documents} onOpenDocument={props.onOpenDocument} />;
  }

  const { status, documentId, draftId, environment = 1, onOpenDocument, onOpenDraft } = props;
  if (!status) return null;

  const failed = status === 'failed';
  const rejected = status === 'rejected';
  const cancelled = status === 'cancelled';
  const prepared = status === 'prepared';
  const pending = status === 'pending';
  const estornoWaiting = prepared || pending;
  const label = props.kind === 'estorno' ? 'NFE' : 'NFD';
  const documentName = props.kind === 'estorno' ? 'de estorno fiscal' : 'de devolução fiscal';
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
        className={`${orderBadgeIndicatorClass} ${orderBadgeIndicatorColorClass(iconClass, iconColorClass)}`}
      >
        <i className={`bi ${iconClass} ${orderBadgeIndicatorIconClass}`} />
      </span>
    </>
  );

  if (!documentId) {
    if (draftId) {
      return (
        <button
          type="button"
          title={`${title} · Abrir detalhes da nota fiscal de estorno fiscal`}
          aria-label={`${title} · Abrir detalhes da nota fiscal de estorno fiscal`}
          className={`${className} cursor-pointer hover:ring-2 hover:ring-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
          onClick={(event) => {
            event.stopPropagation();
            if (onOpenDocument) {
              onOpenDocument(draftId, environment);
            } else if (onOpenDraft) {
              onOpenDraft(draftId);
            } else {
              navigate(`/fiscal-documents?draftId=${encodeURIComponent(draftId)}`);
            }
          }}
        >
          {contents}
        </button>
      );
    }
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
