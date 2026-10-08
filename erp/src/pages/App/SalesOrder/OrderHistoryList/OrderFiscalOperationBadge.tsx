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

  const isEstorno = kind === 'estorno';
  const failed = status === 'failed';
  const rejected = status === 'rejected';
  const cancelled = status === 'cancelled';
  const prepared = status === 'prepared';
  const pending = status === 'pending';
  const estornoWaiting = isEstorno && (prepared || pending);
  const label = kind === 'estorno' ? 'NFE' : 'NFD';
  const documentName = kind === 'estorno' ? 'de estorno' : 'de devolução';
  const environmentLabel = environment === 2 ? ' em homologação' : '';
  const title = failed
    ? `Nota fiscal ${documentName} com erro${environmentLabel}`
    : rejected
      ? `Nota fiscal ${documentName} rejeitada${environmentLabel}`
      : cancelled
        ? `Nota fiscal ${documentName} cancelada${environmentLabel}`
        : prepared
          ? isEstorno
            ? `Nota fiscal ${documentName} preparada; aguardando emissão${environmentLabel}`
            : `Nota fiscal ${documentName} preparada para revisão${environmentLabel}`
          : pending
            ? isEstorno
              ? `Nota fiscal ${documentName} aguardando confirmação da SEFAZ${environmentLabel}`
              : `Nota fiscal ${documentName} aguardando reconciliação${environmentLabel}`
            : `Nota fiscal ${documentName} emitida${environmentLabel}`;
  const colorClass = cancelled
    ? 'border-red-700 bg-red-600 text-white hover:bg-red-700'
    : rejected && isEstorno
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
    : rejected && isEstorno
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
    : rejected && isEstorno
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
