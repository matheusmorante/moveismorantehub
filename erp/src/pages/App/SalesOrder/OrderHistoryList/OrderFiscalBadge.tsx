import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderFiscalBadgeStatus } from '@/pages/utils/nfe/orderFiscalBadgeRules';
import {
  binaryOrderBadgeClass,
  orderBadgeIndicatorClass,
  orderBadgeIndicatorColorClass,
  orderBadgeIndicatorIconClass,
} from './orderBadgeStyles';

interface BadgeConfig {
  label: string;
  title: string;
  className: string;
  icon?: string;
  iconBadgeClassName?: string;
}

// Amarelo = ação fiscal necessária (não é erro). Texto escuro garante contraste WCAG AAA.
const AWAITING_REISSUE_CLASS =
  'border-amber-700 bg-amber-500 text-[#3b1900] hover:bg-amber-400';
const AWAITING_REISSUE_INDICATOR_CLASS = 'bg-amber-700 text-white';
// Vermelho = falha real no cancelamento/estorno da nota anterior.
const REGULARIZATION_FAILED_CLASS = 'border-red-700 bg-red-600 text-white hover:bg-red-700';
const REGULARIZATION_FAILED_INDICATOR_CLASS = 'bg-red-800 text-white';
// Laranja = resultado incerto: consultar e reconciliar antes de qualquer nova tentativa.
const REGULARIZATION_UNCERTAIN_CLASS =
  'border-orange-700 bg-orange-600 text-white hover:bg-orange-700';
const REGULARIZATION_UNCERTAIN_INDICATOR_CLASS = 'bg-orange-800 text-white';

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
  reversed: {
    label: 'NF',
    title: 'Nota fiscal estornada',
    className: 'border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700',
    icon: 'bi-arrow-counterclockwise',
    iconBadgeClassName: 'bg-indigo-700 text-white',
  },
  reissue_required: {
    label: 'NF',
    title: 'Nova nota fiscal necessária',
    className: AWAITING_REISSUE_CLASS,
    icon: 'bi-exclamation-lg',
    iconBadgeClassName: AWAITING_REISSUE_INDICATOR_CLASS,
  },
  regularization_failed: {
    label: 'NF',
    title: 'Erro na regularização fiscal',
    className: REGULARIZATION_FAILED_CLASS,
    icon: 'bi-exclamation-octagon-fill',
    iconBadgeClassName: REGULARIZATION_FAILED_INDICATOR_CLASS,
  },
  regularization_uncertain: {
    label: 'NF',
    title: 'Regularização fiscal pendente',
    className: REGULARIZATION_UNCERTAIN_CLASS,
    icon: 'bi-question-lg',
    iconBadgeClassName: REGULARIZATION_UNCERTAIN_INDICATOR_CLASS,
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
  reversed: {
    label: 'NFH',
    title: 'Nota fiscal de homologação estornada',
    className: 'border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700',
    icon: 'bi-arrow-counterclockwise',
    iconBadgeClassName: 'bg-indigo-700 text-white',
  },
  reissue_required: {
    label: 'NFH',
    title: 'Nova nota fiscal de homologação necessária',
    className: AWAITING_REISSUE_CLASS,
    icon: 'bi-exclamation-lg',
    iconBadgeClassName: AWAITING_REISSUE_INDICATOR_CLASS,
  },
  regularization_failed: {
    label: 'NFH',
    title: 'Erro na regularização fiscal da homologação',
    className: REGULARIZATION_FAILED_CLASS,
    icon: 'bi-exclamation-octagon-fill',
    iconBadgeClassName: REGULARIZATION_FAILED_INDICATOR_CLASS,
  },
  regularization_uncertain: {
    label: 'NFH',
    title: 'Regularização fiscal da homologação pendente',
    className: REGULARIZATION_UNCERTAIN_CLASS,
    icon: 'bi-question-lg',
    iconBadgeClassName: REGULARIZATION_UNCERTAIN_INDICATOR_CLASS,
  },
};

interface OrderFiscalBadgeProps {
  readonly status?: OrderFiscalBadgeStatus;
  readonly variant?: 'production' | 'homologation';
  readonly loading?: boolean;
  readonly documentId?: string;
  readonly label?: string;
  readonly hasReturn?: boolean;
  readonly onOpenDocument?: (documentId: string, environment: 1 | 2) => void;
  readonly onIssue?: (environment: 1 | 2) => void;
}

export const OrderFiscalBadge: React.FC<OrderFiscalBadgeProps> = ({
  status,
  variant = 'production',
  loading = false,
  documentId,
  label,
  hasReturn = false,
  onOpenDocument,
  onIssue,
}) => {
  const navigate = useNavigate();
  const resolvedStatus = status || 'not_issued';
  if (!resolvedStatus) return null;

  const targetEnvironment: 1 | 2 = variant === 'homologation' ? 2 : 1;
  const isHomologation = variant === 'homologation';
  if (isHomologation && resolvedStatus === 'not_issued' && !loading && !label) return null;

  const renderBadge = (presentation: BadgeConfig) => {
    const badgeLabel = label || presentation.label;
    const baseTitle = label ? `${label} · ${presentation.title}` : presentation.title;
    const fullTitle = hasReturn ? `${baseTitle} (com devolução)` : baseTitle;
    const className = `relative inline-flex h-6 min-w-8 items-center justify-center rounded-md border px-2 text-[11px] font-black leading-none ${presentation.className}`;
    const title = loading ? 'Atualizando status fiscal do pedido' : fullTitle;
    const contents = (
      <>
        {loading && (
          <span
            aria-hidden="true"
            className="order-fiscal-badge-shimmer-container"
          >
            <span className="order-fiscal-badge-shimmer-beam" />
          </span>
        )}
        <span className="relative z-10 flex items-center gap-0.5">
          <span>{badgeLabel}</span>
          {hasReturn && (
            <i
              className={`bi bi-arrow-return-left text-[9px] font-bold ${resolvedStatus === 'reissue_required' ? 'text-[#3b1900]' : 'text-amber-300'}`}
              title="Possui devolução vinculada"
              aria-label="Possui devolução vinculada"
            />
          )}
        </span>
        {presentation.icon ? (
          <span
            aria-hidden="true"
            className={`${orderBadgeIndicatorClass} ${orderBadgeIndicatorColorClass(presentation.icon, presentation.iconBadgeClassName || '')}`}
          >
            <i className={`bi ${presentation.icon} ${orderBadgeIndicatorIconClass}`} />
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
      const issueActionTitle = `${baseTitle} · Clique para emitir em ${isHomologation ? 'homologação' : 'produção'}`;
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
