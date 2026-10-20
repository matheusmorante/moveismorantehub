import React from 'react';
import type { FiscalPendencyType } from '../../types/fiscalPendencies.types';
import { FISCAL_PENDENCY_TYPE_CONFIG } from '../../types/fiscalPendencies.types';

interface FiscalPendencyTypeBadgeProps {
  readonly type: FiscalPendencyType;
  readonly showIcon?: boolean;
}

export const FiscalPendencyTypeBadge: React.FC<FiscalPendencyTypeBadgeProps> = ({
  type,
  showIcon = true,
}) => {
  const config = FISCAL_PENDENCY_TYPE_CONFIG[type] || {
    label: type,
    description: '',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
    icon: 'bi-exclamation-circle',
  };

  return (
    <span
      title={config.description}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold tracking-tight shadow-2xs transition-colors ${config.badgeClass}`}
    >
      {showIcon && <i aria-hidden="true" className={`bi ${config.icon} text-xs shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};
