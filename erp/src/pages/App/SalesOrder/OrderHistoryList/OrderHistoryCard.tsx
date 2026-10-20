import React from 'react';
import { getSettings } from '@/pages/utils/settingsService';
import { resolveOrderColor } from '../../../utils/orderTypeColorUtils';
import CancelledOrderBadge from './CancelledOrderBadge';
import { getOrderAssemblyFlags, isPaidTrafficOrder } from './orderItemHandlingUtils';
import { OrderHistoryCardProps } from './OrderHistoryCard/OrderHistoryCard.types';
import {
  buildOrderCardStatusConfig,
  resolveCardBgBorderClass,
  resolveCardCapabilities,
  resolveCardHeaderAccentClass,
  resolveCardTimeDisplay,
} from './OrderHistoryCard/orderCardPresentation';
import { OrderCardHeader } from './OrderHistoryCard/OrderCardHeader';
import { OrderCardBody } from './OrderHistoryCard/OrderCardBody';
import { OrderCardFooter } from './OrderHistoryCard/OrderCardFooter';

export type { OrderHistoryCardProps };

const OrderHistoryCard: React.FC<OrderHistoryCardProps> = ({
  order,
  fiscalBadgeStatus,
  fiscalHmlBadgeStatus,
  fiscalBadgeLoading,
  fiscalDocumentId,
  fiscalHmlDocumentId,
  fiscalCancellationState,
  fiscalCancellationDocuments,
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
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onAction,
  onStatusUpdate,
  showTrash,
  onBlingUpdate,
  onStockCheckUpdate,
  isHighlighted,
  id,
  onFilterByOrderId,
  onViewDetails,
  onViewFiscalDocument,
  onShowPostSaleActions,
  onIssueNfe,
}) => {
  const settings = getSettings();
  const { isDraft, isCancelled, canViewDetails, isEditLocked } = resolveCardCapabilities(order);
  const statusConfig = buildOrderCardStatusConfig(order, settings);

  const colors = settings.orderTypeColors ?? {
    delivery: 'green',
    pickup: 'purple',
    assistance: 'orange',
  };
  const colorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
  const { hasAssemblyDepot, hasAssemblyOutside } = getOrderAssemblyFlags(order, settings);
  const isPaidTraffic = isPaidTrafficOrder(order);

  const headerAccentClass = resolveCardHeaderAccentClass(order, colorKey, isDraft, isCancelled);
  const cardBgBorderClass = resolveCardBgBorderClass(isCancelled);
  const timeDisplay = resolveCardTimeDisplay(order.shipping?.scheduling);

  const isInteractive = isDraft || canViewDetails;
  const handleCardClick = () => {
    if (isDraft) {
      onEdit(order);
    } else if (canViewDetails) {
      onViewDetails?.(order);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      isInteractive &&
      event.target === event.currentTarget &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div
      id={id}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleCardClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={`${cardBgBorderClass} min-h-fit ${isHighlighted ? 'animate-highlight' : ''} rounded-xl shadow-none transition-all relative overflow-visible ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500' : 'cursor-default'}`}
    >
      {isCancelled && (
        <CancelledOrderBadge
          tilted
          large
          text={
            order.orderType === 'return' && order.returnStockReversed ? 'Estornado' : 'Cancelado'
          }
        />
      )}

      <OrderCardHeader
        order={order}
        headerAccentClass={headerAccentClass}
        isCancelled={isCancelled}
        isPaidTraffic={isPaidTraffic}
        statusConfig={statusConfig}
        hasAssemblyDepot={hasAssemblyDepot}
        hasAssemblyOutside={hasAssemblyOutside}
        fiscalBadgeStatus={fiscalBadgeStatus}
        fiscalHmlBadgeStatus={fiscalHmlBadgeStatus}
        fiscalBadgeLoading={fiscalBadgeLoading}
        fiscalDocumentId={fiscalDocumentId}
        fiscalHmlDocumentId={fiscalHmlDocumentId}
        fiscalEstornoBadgeStatus={fiscalEstornoBadgeStatus}
        fiscalEstornoDocumentId={fiscalEstornoDocumentId}
        fiscalEstornoDraftId={fiscalEstornoDraftId}
        fiscalEstornoEnvironment={fiscalEstornoEnvironment}
        fiscalDevolucaoBadgeStatus={fiscalDevolucaoBadgeStatus}
        fiscalDevolucaoDocumentId={fiscalDevolucaoDocumentId}
        fiscalDevolucaoEnvironment={fiscalDevolucaoEnvironment}
        fiscalDevolucaoDocuments={fiscalDevolucaoDocuments}
        fiscalProductionBadges={fiscalProductionBadges}
        fiscalHomologationBadges={fiscalHomologationBadges}
        onViewFiscalDocument={onViewFiscalDocument}
        onIssueNfe={onIssueNfe}
        onStatusUpdate={onStatusUpdate}
        onBlingUpdate={onBlingUpdate}
        onStockCheckUpdate={onStockCheckUpdate}
        showTrash={showTrash}
      />

      <OrderCardBody
        order={order}
        isCancelled={isCancelled}
        fiscalCancellationDocuments={fiscalCancellationDocuments}
        fiscalCancellationState={fiscalCancellationState}
        onAction={onAction}
        onFilterByOrderId={onFilterByOrderId}
        showTrash={showTrash}
        showManualPrompt={settings.showManualFulfillmentPrompt}
        onStatusUpdate={onStatusUpdate}
        statusConfig={statusConfig}
        timeDisplay={timeDisplay}
      />

      <OrderCardFooter
        order={order}
        isCancelled={isCancelled}
        isDraft={isDraft}
        isEditLocked={isEditLocked}
        showTrash={showTrash}
        onEdit={onEdit}
        onDelete={onDelete}
        onRestore={onRestore}
        onPermanentDelete={onPermanentDelete}
        onAction={onAction}
        onStatusUpdate={onStatusUpdate}
        onShowPostSaleActions={onShowPostSaleActions}
      />
    </div>
  );
};

export default OrderHistoryCard;
