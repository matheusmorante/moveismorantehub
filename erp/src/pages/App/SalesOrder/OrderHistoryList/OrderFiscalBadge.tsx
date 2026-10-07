import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderFiscalBadgeStatus } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import { binaryOrderBadgeClass } from './orderBadgeStyles';

interface BadgeConfig {
  label: string;
  title: string;
  className: string;
  icon?: string;
  iconBadgeClassName?: string;
}

const PROD_BADGE_PRESENTATION: Record<OrderFiscalBadgeStatus, BadgeConfig> = {
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
    className:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    icon: 'bi-x',
    iconBadgeClassName: 'bg-rose-600 text-white',
  },
  reversed: {
    label: 'NF',
    title: 'Nota fiscal de devolução ou estorno',
    className:
      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
    icon: 'bi-arrow-counterclockwise',
    iconBadgeClassName: 'bg-orange-600 text-white',
  },
};

const HML_BADGE_PRESENTATION: Record<OrderFiscalBadgeStatus, BadgeConfig> = {
  not_issued: {
    label: 'NFH',
    title: 'Nota fiscal de homologação não emitida',
    className: binaryOrderBadgeClass(false),
  },
  issued: {
    label: 'NFH',
    title: 'Nota fiscal de homologação emitida',
    className: binaryOrderBadgeClass(true),
    icon: 'bi-check',
    iconBadgeClassName: 'bg-emerald-600 text-white',
  },
  cancelled: {
    label: 'NFH',
    title: 'Nota fiscal de homologação cancelada',
    className:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    icon: 'bi-x',
    iconBadgeClassName: 'bg-rose-600 text-white',
  },
  reversed: {
    label: 'NFH',
    title: 'Nota fiscal de homologação de devolução ou estorno',
    className:
      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
    icon: 'bi-arrow-counterclockwise',
    iconBadgeClassName: 'bg-orange-600 text-white',
  },
};

interface OrderFiscalBadgeProps {
  readonly status?: OrderFiscalBadgeStatus;
  readonly reversed?: boolean;
  readonly variant?: 'production' | 'homologation';
  readonly documentId?: string;
  readonly onOpenDocument?: (documentId: string, environment: 1 | 2) => void;
  readonly onIssue?: (environment: 1 | 2) => void;
}

export const OrderFiscalBadge: React.FC<OrderFiscalBadgeProps> = ({
  status,
  reversed = false,
  variant = 'production',
  documentId,
  onOpenDocument,
  onIssue,
}) => {
  const navigate = useNavigate();
  const resolvedStatus = reversed ? 'reversed' : status || 'not_issued';
  if (!resolvedStatus) return null;

  const targetEnvironment: 1 | 2 = variant === 'homologation' ? 2 : 1;
  const isHomologation = variant === 'homologation';

  const renderBadge = (presentation: BadgeConfig) => {
    const className = `relative inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-1.5 text-[9px] font-black leading-none ${presentation.className}`;
    const contents = (
      <>
        {presentation.label}
        {presentation.icon && (
          <span
            aria-hidden="true"
            className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white dark:border-slate-900 ${presentation.iconBadgeClassName}`}
          >
            <i className={`bi ${presentation.icon} text-[9px]`} />
          </span>
        )}
      </>
    );

    if (documentId) {
      return (
        <button
          type="button"
          title={`${presentation.title} · Abrir documento fiscal`}
          aria-label={`${presentation.title} · Abrir documento fiscal`}
          className={`${className} cursor-pointer hover:ring-2 hover:ring-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          onClick={(event) => {
            event.stopPropagation();
            if (onOpenDocument) {
              onOpenDocument(documentId, targetEnvironment);
              return;
            }
            navigate(`/fiscal-documents?documentId=${encodeURIComponent(documentId)}`);
          }}
        >
          {contents}
        </button>
      );
    }

    if (resolvedStatus === 'not_issued' && onIssue) {
      const issueActionTitle = `${presentation.title} · Clique para emitir em ${isHomologation ? 'homologação' : 'produção'}`;
      return (
        <button
          type="button"
          title={issueActionTitle}
          aria-label={issueActionTitle}
          className={`${className} cursor-pointer hover:ring-2 hover:ring-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          onClick={(event) => {
            event.stopPropagation();
            onIssue(targetEnvironment);
          }}
        >
          {contents}
        </button>
      );
    }

    return (
      <span title={presentation.title} aria-label={presentation.title} className={className}>
        {contents}
      </span>
    );
  };

  if (variant === 'homologation') {
    const presentation = HML_BADGE_PRESENTATION[resolvedStatus];
    if (!presentation) return null;

    return renderBadge(presentation);
  }

  const presentation = PROD_BADGE_PRESENTATION[resolvedStatus];

  return renderBadge(presentation);
};
