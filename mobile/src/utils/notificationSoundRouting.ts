export const SCHEDULED_ORDER_CHANNEL = 'morante_scheduled_orders_v1';
export const GENERAL_NOTIFICATION_CHANNEL = 'morante_general_v1';

export const isNewScheduledOrderNotification = (payload: any = {}): boolean => {
  const data = payload.orderData || payload.order_data || payload.data?.orderData || {};
  const status = String(data.status || payload.status || '').trim().toLowerCase();
  const type = payload.type || payload.data?.type;
  return type === 'order_created' && ['scheduled', 'agendado'].includes(status);
};
