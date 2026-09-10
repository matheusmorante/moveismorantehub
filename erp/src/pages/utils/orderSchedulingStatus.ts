import Shipping from "../types/Shipping.type";

export const formatOrderSchedulingText = (shipping: any, order?: any): string => {
    const sched = shipping?.scheduling || {};
    if (sched.pendingScheduling) return 'Agendamento: Pendente';

    const formatDateStr = (dStr: string) => {
        if (!dStr) return '';
        const clean = dStr.split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return clean;
    };

    const startDate = sched.date || order?.scheduled_date || order?.order_data?.scheduledDate;
    const endDate = sched.endDate;

    let dateLabel = '';
    if (sched.dateType === 'range' && endDate && startDate) {
        dateLabel = `${formatDateStr(startDate)} até ${formatDateStr(endDate)}`;
    } else if (startDate) {
        dateLabel = formatDateStr(startDate);
    }

    let timeLabel = '';
    if (sched.type === 'range' && sched.startTime && sched.endTime) {
        timeLabel = `${sched.startTime} até ${sched.endTime}`;
    } else if (sched.startTime) {
        timeLabel = sched.startTime;
    } else if (sched.time) {
        timeLabel = sched.time;
    }

    if (dateLabel && timeLabel) return `Agendado: ${dateLabel} (${timeLabel})`;
    if (dateLabel) return `Agendado: ${dateLabel}`;
    return '';
};

export const resolveCompletedOrderStatus = (order: { shipping?: Shipping; orderType?: string; status?: string }): 'draft' | 'scheduled' | 'fulfilled' => {
    if (order.orderType === 'budget') return 'draft';

    const shipping = order.shipping;
    const isPickup = shipping?.deliveryMethod === 'pickup';

    if (isPickup) {
        const scheduling = shipping?.scheduling;
        if (scheduling?.pendingScheduling) {
            return 'scheduled';
        }

        const schedDateStr = scheduling?.date?.trim();
        if (schedDateStr) {
            const todayStr = new Date().toISOString().split('T')[0];
            if (schedDateStr <= todayStr) {
                return 'fulfilled';
            }
            return 'scheduled';
        }

        return 'fulfilled';
    }

    return 'scheduled';
};
