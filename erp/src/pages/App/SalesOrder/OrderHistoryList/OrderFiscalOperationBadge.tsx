import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderFiscalOperationBadgeStatus } from '@/pages/utils/nfe/orderFiscalBadgeRules';

interface OrderFiscalOperationBadgeProps {
  readonly kind: 'estorno' | 'devolucao';
  readonly status?: OrderFiscalOperationBadgeStatus;
  readonly documentId?: string;
  readonly environment?: 1 | 2;
  readonly onOpenDocument?: (documentId: string, environment: 1 | 2) => void;
}

export const OrderFiscalOperationBadge: React.FC<OrderFiscalOperationBadgeProps> = ({
  kind,
  status,
  documentId,
  environment = 1,
  onOpenDocument,
}) => {
  const navigate = useNavigate();
  if (!status) return null;

  const failed = status === 'failed';
  const label = kind === 'estorno' ? 'NFE' : 'NFD';
  const documentName = kind === 'estorno' ? 'de estorno' : 'de devolução';
  const environmentLabel = environment === 2 ? ' em homologação' : '';
  const title = failed
    ? `Nota fiscal ${documentName} com erro ou rejeitada${environmentLabel}`
    : `Nota fiscal ${documentName} emitida${environmentLabel}`;
  const colorClass = failed
    ? 'border-red-700 bg-red-600 text-white hover:bg-red-700'
    : 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700';
  const className = `relative inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-1.5 text-[9px] font-black leading-none ${colorClass}`;

  const contents = (
    <>
      {label}
      <span
        aria-hidden="true"
        className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white dark:border-slate-900 ${failed ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white'}`}
      >
        <i className={`bi ${failed ? 'bi-exclamation' : 'bi-check'} text-[9px]`} />
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
        if (onOpenDocument) {
          onOpenDocument(documentId, environment);
          return;
        }
        navigate(`/fiscal-documents?documentId=${encodeURIComponent(documentId)}`);
      }}
    >
      {contents}
    </button>
  );
};
