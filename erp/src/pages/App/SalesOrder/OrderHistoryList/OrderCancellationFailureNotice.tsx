import React from 'react';
import type { OrderFiscalCancellationState } from '@/pages/utils/nfe/orderFiscalBadgeRules';

interface OrderCancellationFailureNoticeProps {
  readonly state?: OrderFiscalCancellationState;
}

export const OrderCancellationFailureNotice: React.FC<OrderCancellationFailureNoticeProps> = ({
  state,
}) => {
  if (!state) return null;

  const presentation = {
    failed: {
      label: 'Falha na tentativa de cancelamento',
      icon: 'bi-exclamation-circle',
      color: 'text-red-600',
    },
    pending: {
      label: 'Cancelamento fiscal pendente',
      icon: 'bi-clock-history',
      color: 'text-sky-700 dark:text-sky-300',
    },
    verify: {
      label: 'Verificar resultado do cancelamento',
      icon: 'bi-question-circle',
      color: 'text-amber-700 dark:text-amber-300',
    },
  }[state];

  return (
    <span
      role="status"
      aria-label={presentation.label}
      title={presentation.label}
      className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-4 ${presentation.color}`}
    >
      <i aria-hidden="true" className={`bi ${presentation.icon} text-[12px]`} />
      {presentation.label}
    </span>
  );
};
