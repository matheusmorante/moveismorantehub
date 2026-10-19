import Order, { IsButtonsClicked, IsButtonsStale } from '../types/order.type';

export const POST_SALE_ACTION_KEYS_TO_REFRESH_AFTER_EDIT: Array<keyof IsButtonsClicked> = [
  'printReceipt',
  'printPromissoryNote',
  'printWarrantyTerm',
  'printShippingOrder',
  'sendShippingOrder',
  'sendCustomerOrder',
  'sendCustomerOrderDirectApi',
];

export const getPostSaleActionsStaleAfterEdit = (
  order: Pick<Order, 'isButtonsClicked' | 'isButtonsStale'>
): IsButtonsStale => {
  const staleActions = { ...order.isButtonsStale };
  POST_SALE_ACTION_KEYS_TO_REFRESH_AFTER_EDIT.forEach((key) => {
    if (order.isButtonsClicked?.[key]) staleActions[key] = true;
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
  'sendCustomerOrderDirectApi',
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
  const isValidType = (order.orderType || 'sale') === 'sale';
  const isValidStatus = status === 'scheduled' || status === 'fulfilled';
  return isValidType && isValidStatus;
};
