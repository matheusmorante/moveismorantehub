import React from 'react';
import Order from '../../../../types/order.type';
import { formatOrderCode } from '../../../../utils/orderCode';
import { OrderFiscalBadge } from '../OrderFiscalBadge';
import { OrderFiscalOperationBadge } from '../OrderFiscalOperationBadge';
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
        {order.orderType !== 'return' && (
          <>
            {fiscalProductionBadges && fiscalProductionBadges.length > 0 ? (
              fiscalProductionBadges.map((badge) => (
                <OrderFiscalBadge
                  key={`prod-${badge.sequenceNumber}`}
                  status={badge.status}
                  label={badge.label}
                  loading={fiscalBadgeLoading}
                  documentId={badge.id}
                  onOpenDocument={onViewFiscalDocument}
                  onIssue={isCancelled ? undefined : (env) => onIssueNfe?.(order, env)}
                />
              ))
            ) : (
              <OrderFiscalBadge
                status={fiscalBadgeStatus}
                loading={fiscalBadgeLoading}
                documentId={fiscalDocumentId}
                onOpenDocument={onViewFiscalDocument}
                onIssue={isCancelled ? undefined : (env) => onIssueNfe?.(order, env)}
              />
            )}
            {fiscalHomologationBadges && fiscalHomologationBadges.length > 0 ? (
              fiscalHomologationBadges
                .filter((badge) => badge.sequenceNumber === 1)
                .map((badge) => (
                  <OrderFiscalBadge
                    key={`hml-${badge.sequenceNumber}`}
                    variant="homologation"
                    status={badge.status}
                    label={badge.label}
                    loading={fiscalBadgeLoading}
                    documentId={badge.id}
                    onOpenDocument={onViewFiscalDocument}
                    onIssue={isCancelled ? undefined : (env) => onIssueNfe?.(order, env)}
                  />
                ))
            ) : (
              <OrderFiscalBadge
                variant="homologation"
                status={fiscalHmlBadgeStatus}
                loading={fiscalBadgeLoading}
                documentId={fiscalHmlDocumentId}
                onOpenDocument={onViewFiscalDocument}
                onIssue={isCancelled ? undefined : (env) => onIssueNfe?.(order, env)}
              />
            )}
            <OrderFiscalOperationBadge
              kind="estorno"
              status={fiscalEstornoBadgeStatus}
              documentId={fiscalEstornoDocumentId}
              draftId={fiscalEstornoDraftId}
              environment={fiscalEstornoEnvironment}
              onOpenDocument={onViewFiscalDocument}
            />
            {fiscalHomologationBadges &&
              fiscalHomologationBadges
                .filter((badge) => badge.sequenceNumber > 1)
                .map((badge) => (
                  <OrderFiscalBadge
                    key={`hml-${badge.sequenceNumber}`}
                    variant="homologation"
                    status={badge.status}
                    label={badge.label}
                    loading={fiscalBadgeLoading}
                    documentId={badge.id}
                    onOpenDocument={onViewFiscalDocument}
                    onIssue={isCancelled ? undefined : (env) => onIssueNfe?.(order, env)}
                  />
                ))}
          </>
        )}
        <OrderFiscalOperationBadge
          kind="devolucao"
          status={fiscalDevolucaoBadgeStatus}
          documentId={fiscalDevolucaoDocumentId}
          environment={fiscalDevolucaoEnvironment}
          documents={fiscalDevolucaoDocuments}
          onOpenDocument={onViewFiscalDocument}
        />
        <div
          className={`flex items-center gap-1.5 flex-wrap justify-end ${isCancelled ? 'opacity-70 pointer-events-none' : ''}`}
          onClick={isCancelled ? undefined : (e) => e.stopPropagation()}
        >
          <OrderOperationalBadges
            order={order}
            showTrash={showTrash}
            isPaidTraffic={isPaidTraffic}
            statusConfig={statusConfig}
            onStatusUpdate={onStatusUpdate}
            onBlingUpdate={onBlingUpdate}
            onStockCheckUpdate={onStockCheckUpdate}
          />
          <OrderAssemblyBadges
            hasAssemblyDepot={hasAssemblyDepot}
            hasAssemblyOutside={hasAssemblyOutside}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};
