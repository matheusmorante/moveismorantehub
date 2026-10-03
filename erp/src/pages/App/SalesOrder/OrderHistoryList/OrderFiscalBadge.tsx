import React from 'react';
import type { OrderFiscalBadgeStatus } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { binaryOrderBadgeClass } from './orderBadgeStyles';
import { OrderBadgeCornerIcon } from './OrderBadgeCornerIcon';

const BADGE_PRESENTATION: Record<
  OrderFiscalBadgeStatus,
  { label: string; title: string; className: string; icon?: 'check' | 'cancel' | 'return' | 'estorno'; iconBadgeClassName?: string }
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
    icon: 'check',
    iconBadgeClassName: 'bg-emerald-600 text-white',
  },
  cancelled: {
    label: 'NF',
    title: 'Nota fiscal cancelada',
    className: 'border-red-700 bg-red-600 text-white hover:bg-red-700',
    icon: 'cancel',
    iconBadgeClassName: 'bg-red-600 text-white',
  },
  return: {
    label: 'NF',
    title: 'Nota fiscal de devolução',
    className: 'border-orange-700 bg-orange-500 text-white hover:bg-orange-600',
    icon: 'return',
    iconBadgeClassName: 'bg-orange-500 text-white',
  },
  estorno: {
    label: 'NF',
    title: 'Nota fiscal de estorno',
    className: 'border-purple-700 bg-purple-600 text-white hover:bg-purple-700',
    icon: 'estorno',
    iconBadgeClassName: 'bg-purple-600 text-white',
  },
};

interface OrderFiscalBadgeProps {
  readonly status?: OrderFiscalBadgeStatus;
  readonly reversed?: boolean;
}

export const OrderFiscalBadge: React.FC<OrderFiscalBadgeProps> = ({ status, reversed = false }) => {
  const resolvedStatus = reversed ? 'return' : status;
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
        <OrderBadgeCornerIcon
          variant={presentation.icon}
          className={presentation.iconBadgeClassName ?? ''}
        />
      )}
    </span>
  );
};
