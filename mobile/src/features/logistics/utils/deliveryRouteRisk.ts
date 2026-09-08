import type { DeliveryRouteItem } from '../hooks/useDeliveryRoute';

export interface OutOfOrderRisk {
  hasRisk: boolean;
  riskyItemName?: string;
  riskyTime?: string;
  riskyOrderCode?: string;
}

/**
 * Informa quando a próxima ação pularia uma entrega com horário fixo ou prioridade.
 * Não reordena nem modifica o roteiro.
 */
export const checkOutOfOrderRisk = (
  targetItem: DeliveryRouteItem | null,
  routeItems: DeliveryRouteItem[],
): OutOfOrderRisk => {
  if (!targetItem || targetItem.status !== 'pending') return { hasRisk: false };

  const pendingItems = routeItems.filter(item => item.status === 'pending');
  if (pendingItems.length <= 1) return { hasRisk: false };

  const targetIndex = pendingItems.findIndex(item => item.id === targetItem.id);
  if (targetIndex <= 0) return { hasRisk: false };

  const riskyPriorItem = pendingItems
    .slice(0, targetIndex)
    .find(item => item.isFixedTime || item.restrictionLevel === 'fixed' || item.periodLabel.includes('🔒') || item.periodLabel.includes('⚠️'));

  if (!riskyPriorItem) return { hasRisk: false };

  return {
    hasRisk: true,
    riskyItemName: riskyPriorItem.customerName,
    riskyTime: riskyPriorItem.periodLabel,
    riskyOrderCode: riskyPriorItem.orderIndex,
  };
};
