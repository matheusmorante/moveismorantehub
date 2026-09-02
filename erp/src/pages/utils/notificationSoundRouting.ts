export const SCHEDULED_ORDER_CHANNEL = 'morante_scheduled_orders_v2';
export const ORDER_UPDATED_CHANNEL = 'morante_order_updated_v2';
export const ORDER_CANCELLED_CHANNEL = 'morante_order_cancelled_v2';
export const GENERAL_NOTIFICATION_CHANNEL = 'morante_general_v1';

export const isNewScheduledOrderNotification = (payload: {
    type?: string;
    orderData?: any;
}): boolean => {
    const status = String(payload.orderData?.status || '').trim().toLowerCase();
    return payload.type === 'order_created' && ['scheduled', 'agendado'].includes(status);
};

export const isOrderUpdatedNotification = (payload: { type?: string }): boolean =>
    payload.type === 'order_edited';

export const isOrderCancelledNotification = (payload: { type?: string; orderData?: any }): boolean =>
    payload.type === 'order_edited'
    && ['cancelled', 'cancelado'].includes(String(payload.orderData?.status || '').trim().toLowerCase());

export const getNotificationSoundRoute = (payload: { type?: string; orderData?: any }) => {
    const scheduledOrder = isNewScheduledOrderNotification(payload);
    const cancelledOrder = isOrderCancelledNotification(payload);
    const updatedOrder = isOrderUpdatedNotification(payload);
    return {
        sound: scheduledOrder ? 'levelup.mp3' : cancelledOrder ? 'order_cancelled.mp3' : updatedOrder ? 'order_updated.mp3' : 'default',
        channelId: scheduledOrder ? SCHEDULED_ORDER_CHANNEL : cancelledOrder ? ORDER_CANCELLED_CHANNEL : updatedOrder ? ORDER_UPDATED_CHANNEL : GENERAL_NOTIFICATION_CHANNEL,
    };
};
