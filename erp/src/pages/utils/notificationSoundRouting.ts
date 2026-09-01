export const SCHEDULED_ORDER_CHANNEL = 'morante_scheduled_orders_v1';
export const GENERAL_NOTIFICATION_CHANNEL = 'morante_general_v1';

export const isNewScheduledOrderNotification = (payload: {
    type?: string;
    orderData?: any;
}): boolean => {
    const status = String(payload.orderData?.status || '').trim().toLowerCase();
    return payload.type === 'order_created' && ['scheduled', 'agendado'].includes(status);
};

export const getNotificationSoundRoute = (payload: { type?: string; orderData?: any }) => {
    const scheduledOrder = isNewScheduledOrderNotification(payload);
    return {
        sound: scheduledOrder ? 'levelup.mp3' : 'default',
        channelId: scheduledOrder ? SCHEDULED_ORDER_CHANNEL : GENERAL_NOTIFICATION_CHANNEL,
    };
};
