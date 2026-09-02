export const SCHEDULED_ORDER_CHANNEL = 'morante_scheduled_orders_v2';
export const ORDER_UPDATED_CHANNEL = 'morante_order_updated_v2';
export const ORDER_CANCELLED_CHANNEL = 'morante_order_cancelled_v2';
export const GENERAL_NOTIFICATION_CHANNEL = 'morante_general_v1';

export const isNewScheduledOrderNotification = (payload: any = {}): boolean => {
  const data = payload.orderData || payload.order_data || payload.data?.orderData || {};
  const status = String(data.status || payload.status || '').trim().toLowerCase();
  const type = payload.type || payload.data?.type;
  return type === 'order_created' && ['scheduled', 'agendado'].includes(status);
};

export const isOrderUpdatedNotification = (payload: any = {}): boolean => {
  const type = payload.type || payload.data?.type;
  return type === 'order_edited';
};

export const isOrderCancelledNotification = (payload: any = {}): boolean => {
  const data = payload.orderData || payload.order_data || payload.data?.orderData || payload.data || {};
  const type = payload.type || payload.data?.type;
  const status = String(data.status || payload.status || '').trim().toLowerCase();
  return type === 'order_edited' && ['cancelled', 'cancelado'].includes(status);
};
