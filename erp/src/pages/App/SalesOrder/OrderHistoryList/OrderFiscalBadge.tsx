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
  failed: {
    label: 'NF',
    title: 'Nota fiscal com erro',
    className: 'border-red-700 bg-red-600 text-white',
    icon: 'bi-exclamation',
    iconBadgeClassName: 'bg-red-700 text-white',
  },
  rejected: {
    label: 'NF',
    title: 'Nota fiscal rejeitada ou denegada',
    className: 'border-amber-700 bg-amber-500 text-white',
    icon: 'bi-exclamation-triangle-fill',
    iconBadgeClassName: 'bg-amber-700 text-white',
  },
  cancelled: {
    label: 'NF',
    title: 'Nota fiscal cancelada',
    className: 'border-rose-700 bg-rose-600 text-white hover:bg-rose-700',
    icon: 'bi-x',
    iconBadgeClassName: 'bg-rose-700 text-white',
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
  failed: {
    label: 'NFH',
    title: 'Nota fiscal de homologação com erro',
    className: 'border-red-700 bg-red-600 text-white',
    icon: 'bi-exclamation',
    iconBadgeClassName: 'bg-red-700 text-white',
  },
  rejected: {
    label: 'NFH',
    title: 'Nota fiscal de homologação rejeitada ou denegada',
    className: 'border-amber-700 bg-amber-500 text-white',
    icon: 'bi-exclamation-triangle-fill',
    iconBadgeClassName: 'bg-amber-700 text-white',
  },
  cancelled: {
    label: 'NFH',
    title: 'Nota fiscal de homologação cancelada',
    className: 'border-rose-700 bg-rose-600 text-white hover:bg-rose-700',
    icon: 'bi-x',
    iconBadgeClassName: 'bg-rose-700 text-white',
  },
};

interface OrderFiscalBadgeProps {
  readonly status?: OrderFiscalBadgeStatus;
  readonly variant?: 'production' | 'homologation';
  readonly loading?: boolean;
  readonly documentId?: string;
  readonly onOpenDocument?: (documentId: string, environment: 1 | 2) => void;
  readonly onIssue?: (environment: 1 | 2) => void;
}

export const OrderFiscalBadge: React.FC<OrderFiscalBadgeProps> = ({
  status,
  variant = 'production',
  loading = false,
  documentId,
  onOpenDocument,
  onIssue,
}) => {
  const navigate = useNavigate();
  const resolvedStatus = status || 'not_issued';
  if (!resolvedStatus) return null;

  const targetEnvironment: 1 | 2 = variant === 'homologation' ? 2 : 1;
  const isHomologation = variant === 'homologation';
  if (isHomologation && resolvedStatus === 'not_issued' && !loading) return null;

  const renderBadge = (presentation: BadgeConfig) => {
    const className = `relative inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-1.5 text-[9px] font-black leading-none ${presentation.className}`;
    const title = loading ? 'Atualizando status fiscal do pedido' : presentation.title;
    const contents = (
      <>
        {presentation.label}
        {loading ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-blue-600 text-white dark:border-slate-900"
          >
            <i className="bi bi-arrow-repeat animate-spin text-[9px]" />
          </span>
        ) : presentation.icon ? (
          <span
            aria-hidden="true"
            className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white dark:border-slate-900 ${presentation.iconBadgeClassName}`}
          >
            <i className={`bi ${presentation.icon} text-[9px]`} />
          </span>
        ) : null}
      </>
    );

    if (documentId) {
      return (
        <button
          type="button"
          title={loading ? title : `${title} · Abrir documento fiscal`}
          aria-label={loading ? title : `${title} · Abrir documento fiscal`}
          aria-busy={loading}
          disabled={loading}
          className={`${className} ${loading ? 'cursor-wait' : 'cursor-pointer hover:ring-2 hover:ring-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'}`}
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

    if (resolvedStatus === 'not_issued' && onIssue && !loading) {
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
      <span title={title} aria-label={title} aria-busy={loading} className={className}>
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
