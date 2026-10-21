import React from 'react';
import Order from '../../../../types/order.type';
import { formatOrderCode } from '../../../../utils/orderCode';
import { OrderFiscalBadge } from '../OrderFiscalBadge';
import { OrderOperationalBadges } from '../OrderOperationalBadges';
import { OrderAssemblyBadges } from '../OrderAssemblyBadges';
import { OrderHistoryCardProps, OrderStatusConfigMap } from './OrderHistoryCard.types';

interface OrderCardHeaderProps extends Pick<
  OrderHistoryCardProps,
  | 'fiscalBadgeStatus'
  | 'fiscalHmlBadgeStatus'
  | 'fiscalBadgeLoading'
  | 'fiscalDocumentId'
  | 'fiscalHmlDocumentId'
  | 'fiscalEstornoBadgeStatus'
  | 'fiscalEstornoDocumentId'
  | 'fiscalEstornoDraftId'
  | 'fiscalEstornoEnvironment'
  | 'fiscalDevolucaoBadgeStatus'
  | 'fiscalDevolucaoDocumentId'
  | 'fiscalDevolucaoEnvironment'
  | 'fiscalDevolucaoDocuments'
  | 'fiscalProductionBadges'
  | 'fiscalHomologationBadges'
  | 'onViewFiscalDocument'
  | 'onIssueNfe'
  | 'onStatusUpdate'
  | 'onBlingUpdate'
  | 'onStockCheckUpdate'
  | 'showTrash'
> {
  readonly order: Order;
  readonly headerAccentClass: string;
  readonly isCancelled: boolean;
  readonly isPaidTraffic: boolean;
  readonly statusConfig: OrderStatusConfigMap;
  readonly hasAssemblyDepot: boolean;
  readonly hasAssemblyOutside: boolean;
}

export const OrderCardHeader: React.FC<OrderCardHeaderProps> = ({
  order,
  headerAccentClass,
  isCancelled,
  isPaidTraffic,
  statusConfig,
  hasAssemblyDepot,
  hasAssemblyOutside,
  fiscalBadgeStatus,
  fiscalHmlBadgeStatus,
  fiscalBadgeLoading,
  fiscalDocumentId,
  fiscalHmlDocumentId,
  fiscalEstornoBadgeStatus,
  fiscalEstornoDocumentId,
  fiscalEstornoDraftId,
  fiscalEstornoEnvironment,
  fiscalDevolucaoBadgeStatus,
  fiscalDevolucaoDocumentId,
  fiscalDevolucaoEnvironment,
  fiscalDevolucaoDocuments,
  fiscalProductionBadges,
  fiscalHomologationBadges,
  onViewFiscalDocument,
  onIssueNfe,
  onStatusUpdate,
  onBlingUpdate,
  onStockCheckUpdate,
  showTrash,
}) => {
  return (
    <div
      className={`${headerAccentClass} rounded-t-xl px-3 py-2 flex items-center justify-between gap-2 flex-wrap`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
          #{formatOrderCode(order)}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {order.orderType !== 'return' && order.status !== 'draft' && (
          <>
            <OrderFiscalBadge
              status={fiscalBadgeStatus}
              loading={fiscalBadgeLoading}
              documentId={fiscalDocumentId}
              hasReturn={Boolean(
                fiscalDevolucaoBadgeStatus &&
                fiscalDevolucaoBadgeStatus !== 'cancelled' &&
                (fiscalDevolucaoEnvironment !== 2 || fiscalDevolucaoDocuments?.some((d) => d.ambiente !== 2))
              )}
              onOpenDocument={onViewFiscalDocument}
              onIssue={isCancelled ? undefined : (env) => onIssueNfe?.(order, env)}
            />
            <OrderFiscalBadge
              variant="homologation"
              status={fiscalHmlBadgeStatus}
              loading={fiscalBadgeLoading}
              documentId={fiscalHmlDocumentId}
              hasReturn={Boolean(
                fiscalDevolucaoBadgeStatus &&
                fiscalDevolucaoBadgeStatus !== 'cancelled' &&
                (fiscalDevolucaoEnvironment === 2 || fiscalDevolucaoDocuments?.some((d) => d.ambiente === 2))
              )}
              onOpenDocument={onViewFiscalDocument}
              onIssue={isCancelled ? undefined : (env) => onIssueNfe?.(order, env)}
            />
          </>
        )}
        <div
          className={`flex items-center gap-1.5 flex-wrap justify-end ${isCancelled ? 'opacity-70 pointer-events-none' : ''}`}
          onClick={isCancelled ? undefined : (e) => e.stopPropagation()}
        >
          <OrderAssemblyBadges
            hasAssemblyDepot={hasAssemblyDepot}
            hasAssemblyOutside={hasAssemblyOutside}
            size="sm"
          />
          <OrderOperationalBadges
            order={order}
            showTrash={showTrash}
            isPaidTraffic={isPaidTraffic}
            statusConfig={statusConfig}
            onStatusUpdate={onStatusUpdate}
            onBlingUpdate={onBlingUpdate}
            onStockCheckUpdate={onStockCheckUpdate}
          />
        </div>
      </div>
    </div>
  );
};
