const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

export const normalizeScheduleStatus = (order: any): string => {
    const data = order?.order_data || {};
    const status = normalize(order?.status || data.status);
    if (status === 'agendado') return 'scheduled';
    if (status === 'rascunho') return 'draft';
    return status;
};

export const getOperationalScheduleDate = (order: any): string => {
    const data = order?.order_data || {};
    const shipping = order?.shipping || data.shipping || {};
    const scheduling = shipping.scheduling || data.schedule || data.scheduling || order?.schedule || {};

    return scheduling.date
        || scheduling.startDate
        || order?.scheduledDate
        || data.scheduledDate
        || order?.scheduled_date
        || '';
};

export const isScheduledAssistanceOrReturn = (order: any): boolean => {
    const data = order?.order_data || {};
    const type = normalize(order?.orderType || data.orderType || order?.order_type);
    return ['assistance', 'return'].includes(type)
        && normalizeScheduleStatus(order) === 'scheduled'
        && Boolean(getOperationalScheduleDate(order));
};
