import type Order from '@/pages/types/order.type';
import { getSaoPauloDayInfo } from '../../../../../../../../shared-utils/commercialOrderRules';
import { shouldAutoFulfillScheduledSaleOnEdit } from '@/pages/utils/orderHistoryService';

interface BuildUpdatedOrderParams {
  effectiveOrder: Order;
  formState: {
    items: any[];
    shipping: any;
    currentOrder: Order;
    schedulingSessionRef?: {
      current?: {
        dateMode?: string;
      } | null;
    };
  };
}

export function buildUpdatedOrder({
  effectiveOrder,
  formState,
}: BuildUpdatedOrderParams): Order {
  const firstHandling =
    (formState.items || []).find((i: any) => i.handlingType?.trim())?.handlingType || '';
  const currentShipping = formState.shipping || ({} as any);
  let resolvedScheduling = currentShipping.scheduling;
  const sessionDateMode = formState.schedulingSessionRef?.current?.dateMode;

  if (
    resolvedScheduling &&
    !resolvedScheduling.pendingScheduling &&
    !resolvedScheduling.notInformed &&
    !resolvedScheduling.immediatePickup &&
    (sessionDateMode === 'today' || sessionDateMode === 'tomorrow')
  ) {
    const dayInfo = getSaoPauloDayInfo(sessionDateMode === 'today' ? 0 : 1);
    resolvedScheduling = {
      ...resolvedScheduling,
      date: dayInfo.isoDate,
      endDate: '',
      dateType: 'fixed',
    };
  }

  const updatedOrder = {
    ...formState.currentOrder,
    id: effectiveOrder.id,
    items: formState.items,
    shipping: {
      ...currentShipping,
      scheduling: resolvedScheduling,
      orderType: firstHandling || currentShipping.orderType || '',
    },
    isButtonsClicked:
      effectiveOrder.isButtonsClicked || formState.currentOrder.isButtonsClicked,
  } as Order;

  if (shouldAutoFulfillScheduledSaleOnEdit(effectiveOrder, updatedOrder)) {
    updatedOrder.status = 'fulfilled';
  }

  return updatedOrder;
}
