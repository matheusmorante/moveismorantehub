import Order from '../types/order.type';

/**
 * Cria um rascunho novo preservando os dados comerciais do pedido.
 * Identificadores e estados de processamento nunca são levados para a cópia.
 */
export const createSalesOrderDuplicate = (order: Order): Order => {
  const source: Record<string, any> = { ...order };
  [
    'id',
    'deleted',
    'deletedAt',
    'orderIndex',
    'orderNumber',
    'order_index',
    'order_number',
    'linkedOrderId',
    'returnOrderId',
    'returnKind',
    'stockProcessed',
    'returnStockProcessed',
    'stockReversed',
    'returnStockReversed',
    'isPartialStockProcessed',
    'movedProductIds',
    'linkedReturnMovement',
    'nfeData',
    'nfeDraft',
    'isStockChecked',
    'isButtonsClicked',
  ].forEach((key) => delete source[key]);

  return {
    ...source,
    status: 'draft',
    items: (source.items || []).map((item: any) => ({
      ...item,
      // A duplicate starts from the same sale facts, but its nested snapshot
      // must not be shared by reference with edits to the source order.
      fiscal: item.fiscal ? { ...item.fiscal } : item.fiscal,
    })),
    payments: (source.payments || []).map((payment: any) => ({ ...payment })),
    customerData: source.customerData
      ? {
          ...source.customerData,
          fullAddress: source.customerData.fullAddress
            ? { ...source.customerData.fullAddress }
            : source.customerData.fullAddress,
        }
      : source.customerData,
    shipping: source.shipping
      ? {
          ...source.shipping,
          scheduling: source.shipping.scheduling
            ? { ...source.shipping.scheduling }
            : source.shipping.scheduling,
          deliveryAddress: source.shipping.deliveryAddress
            ? { ...source.shipping.deliveryAddress }
            : source.shipping.deliveryAddress,
        }
      : source.shipping,
  } as Order;
};
