const normalizeStatus = (value: unknown): string =>
    String(value || '').trim().toLowerCase();

export const isCancelledScheduleOrder = (order: any): boolean => {
    const data = order?.order_data || {};
    const status = normalizeStatus(
        order?.status || data.status || order?.order_status || data.order_status
    );

    return status === 'cancelled'
        || status === 'canceled'
        || status === 'cancelado'
        || status.includes('cancel');
};

export const shouldShowOrderInSchedule = (order: any): boolean => {
    if (!order) return false;
    const data = order.order_data || {};
    const deleted = order.deleted || order.is_deleted || data.deleted;
    return !deleted && !isCancelledScheduleOrder(order);
};
