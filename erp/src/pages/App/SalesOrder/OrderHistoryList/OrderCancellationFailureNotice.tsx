import React from 'react';
import type { OrderFiscalCancellationState } from '@/pages/utils/nfe/orderFiscalBadgeRules';

interface OrderCancellationFailureNoticeProps {
  readonly state?: OrderFiscalCancellationState;
  readonly documentId?: string;
  readonly environment?: 1 | 2;
  readonly onRetry?: (documentId: string) => void;
}

export const OrderCancellationFailureNotice: React.FC<OrderCancellationFailureNoticeProps> = ({
  state,
  documentId,
  environment,
  onRetry,
}) => {
  if (!state) return null;

  const presentation = {
    failed: {
      label: 'Falha na tentativa de cancelamento',
      icon: 'bi-exclamation-circle',
      color: 'text-red-600',
    },
    pending: {
      label: 'Cancelamento pendente de confirmação',
      icon: 'bi-clock-history',
      color: 'text-sky-700 dark:text-sky-300',
    },
    verify: {
      label: 'Cancelamento pendente de confirmação',
      icon: 'bi-question-circle',
      color: 'text-amber-700 dark:text-amber-300',
    },
  }[state];

  const noteLabel = environment === 2 ? 'NFH' : 'NF';
  return (
    <div className="flex items-center gap-2">
      <span
        role="status"
        aria-label={`${noteLabel}: ${presentation.label}`}
        title={`${noteLabel}: ${presentation.label}`}
        className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-4 ${presentation.color}`}
      >
        <i aria-hidden="true" className={`bi ${presentation.icon} text-[12px]`} />
        {noteLabel} — {presentation.label}
      </span>
      {documentId && onRetry && (
        <button
          type="button"
          className="text-[10px] font-bold text-blue-700 underline dark:text-blue-300"
          onClick={(event) => {
            event.stopPropagation();
            onRetry(documentId);
          }}
        >
          {state === 'failed' ? 'Tentar novamente' : 'Verificar'}
        </button>
      )}
    </div>
  );
};
