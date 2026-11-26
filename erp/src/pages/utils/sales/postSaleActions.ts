import Order, { IsButtonsClicked, IsButtonsStale } from '../../types/order.type';

export const POST_SALE_ACTION_KEYS_TO_REFRESH_AFTER_EDIT: Array<keyof IsButtonsClicked> = [
  'printReceipt',
  'printPromissoryNote',
  'printWarrantyTerm',
  'printShippingOrder',
  'sendShippingOrder',
  'sendCustomerOrder',
  'sendCustomerOrderDetails',
  'sendAssistanceOS',
  'printAssistanceOS',
];

export const getPostSaleActionsStaleAfterEdit = (
  order: Pick<Order, 'isButtonsClicked' | 'isButtonsStale'>
): IsButtonsStale => {
  const staleActions = { ...order.isButtonsStale };
  const refreshableKeys = new Set<string>(POST_SALE_ACTION_KEYS_TO_REFRESH_AFTER_EDIT.map(String));
  Object.entries(order.isButtonsClicked || {}).forEach(([key, clicked]) => {
    const actionKey = key.startsWith('operation:') ? key.slice(key.lastIndexOf(':') + 1) : key;
    if (clicked && refreshableKeys.has(actionKey)) staleActions[key] = true;
  });
  return staleActions;
};

export const POST_SALE_ACTION_KEYS = new Set([
  'printShippingOrder',
  'printReceipt',
  'printPromissoryNote',
  'printWarrantyTerm',
  'sendShippingOrder',
  'sendCustomerOrder',
  'sendGroupInvite',
  'sendCustomerReviews',
  'issueNfe',
]);

export const POST_ASSISTANCE_ACTION_KEYS = new Set([
  'sendCustomerOrderDetails',
  'sendAssistanceOS',
  'printAssistanceOS',
]);

export const POST_RETURN_ACTION_KEYS = new Set([
  'printReturnOS',
  'sendReturnOSCustomer',
  'sendReturnOSTeam',
]);

export const canOpenPostSaleActions = (
  order: Partial<Order> | { orderType?: string; status?: string }
): boolean => {
  const status = String(order.status || '')
    .trim()
    .toLowerCase();
  const orderType = order.orderType || 'sale';
  const isValidType = orderType === 'sale' || orderType === 'assistance';
  const isValidStatus = status === 'scheduled' || status === 'fulfilled';
  return isValidType && isValidStatus;
};
