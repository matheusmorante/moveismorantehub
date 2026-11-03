import type { Dispatch, SetStateAction } from 'react';
import type { IsButtonsClicked, Order } from '../../../types/order.type';
import { updateOrder } from '../../../utils/orderHistoryService';

export const persistOrderHistoryActionClick = async (
  actionKey: string,
  orderId: string,
  order: Order,
  setOrders: Dispatch<SetStateAction<Order[]>>
): Promise<void> => {
  const currentClicks = order.isButtonsClicked || {
    printReceipt: false,
    printShippingOrder: false,
    printWarrantyTerm: false,
    sendShippingOrder: false,
    sendCustomerOrder: false,
    sendCustomerReviews: false,
    printShippingLabel: false,
    printProductLabel: false,
    generatePaymentLink: false,
    printBudget: false,
    sendCustomerOrderDetails: false,
    sendAssistanceOS: false,
    sendBudget: false,
  };
  const newClicks: IsButtonsClicked = { ...currentClicks, [actionKey]: true };

  setOrders((previous) =>
    previous.map((item) => (item.id === orderId ? { ...item, isButtonsClicked: newClicks } : item))
  );

  try {
    await updateOrder(orderId, { isButtonsClicked: newClicks }, order, undefined, {
      metadataOnly: true,
    });
    if (actionKey === 'sendCustomerReviews' && !order.reviewRequested) {
      await updateOrder(orderId, { reviewRequested: true }, order, undefined, {
        metadataOnly: true,
      });
    }
  } catch (error) {
    setOrders((previous) =>
      previous.map((item) => (item.id === orderId ? { ...item, isButtonsClicked: currentClicks } : item))
    );
    console.error('Erro ao registrar clique na ação:', error);
  }
};
