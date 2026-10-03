import React from 'react';
import { ArrowLeft, Check, Undo2, X } from 'lucide-react';

type OrderBadgeCornerIconProps = {
  variant: 'check' | 'cancel' | 'return' | 'estorno';
  className: string;
};

const ICONS = {
  check: Check,
  cancel: X,
  return: Undo2,
  estorno: ArrowLeft,
} as const;

export const OrderBadgeCornerIcon = ({ variant, className }: OrderBadgeCornerIconProps) => {
  const Icon = ICONS[variant];

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white text-white dark:border-slate-900 ${className}`}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
    </span>
  );
};
