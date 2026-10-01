import React from 'react';
import type { OrderFiscalBadgeStatus } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { binaryOrderBadgeClass } from './orderBadgeStyles';

const BADGE_PRESENTATION: Record<
  OrderFiscalBadgeStatus,
  { label: string; title: string; className: string; icon?: string; iconBadgeClassName?: string }
> = {
  not_issued: {
    label: 'NF',
    title: 'Nota fiscal não emitida',
    className: binaryOrderBadgeClass(false),
  },
  issued: {
    label: 'NF',
    title: 'Nota fiscal emitida',
    className: binaryOrderBadgeClass(true),
    icon: 'bi-check',
    iconBadgeClassName: 'bg-emerald-600 text-white',
  },
  cancelled: {
    label: 'NF',
    title: 'Nota fiscal cancelada',
    className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    icon: 'bi-x',
    iconBadgeClassName: 'bg-rose-600 text-white',
  },
  reversed: {
    label: 'NF',
    title: 'Nota fiscal de devolução ou estorno',
    className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
    icon: 'bi-arrow-counterclockwise',
    iconBadgeClassName: 'bg-orange-600 text-white',
  },
};

interface OrderFiscalBadgeProps {
  readonly status?: OrderFiscalBadgeStatus;
  readonly reversed?: boolean;
}

export const OrderFiscalBadge: React.FC<OrderFiscalBadgeProps> = ({ status, reversed = false }) => {
  const resolvedStatus = reversed ? 'reversed' : status;
  if (!resolvedStatus) return null;

  const presentation = BADGE_PRESENTATION[resolvedStatus];

  return (
    <span
      title={presentation.title}
      aria-label={presentation.title}
      className={`relative inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-1.5 text-[9px] font-black leading-none ${presentation.className}`}
    >
      {presentation.label}
      {presentation.icon && (
        <span
          aria-hidden="true"
          className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white dark:border-slate-900 ${presentation.iconBadgeClassName}`}
        >
          <i className={`bi ${presentation.icon} text-[9px]`} />
        </span>
      )}
    </span>
  );
};
