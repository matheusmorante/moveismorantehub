import Order from "../../types/order.type";
import { formatOrderCode } from '../orderCode';
import { formatOrderSchedulingText } from '../orderSchedulingStatus';
import { dispatchAppNotification } from '@/pages/utils/pushNotificationService';
import {
    getOrderAssemblyKinds,
    notifyNewAssemblies,
    notifyNewSaleAndAssemblies,
} from '@/pages/utils/orderEventNotificationService';
import {
    detectOrderChangedAreas,
    formatOrderChangeNotification,
    shouldNotifyOrderChange
} from '@/pages/utils/orderChangeDetector';

/**
 * Dispara notificações ao criar um novo pedido.
 */
export const dispatchOrderCreationNotifications = (orderId: string, order: Order): void => {
    if (!order.status || order.status === 'draft') return;

    void (async () => {
        try {
            const schedText = formatOrderSchedulingText(order.shipping, order);
            await notifyNewSaleAndAssemblies({
                orderId: String(orderId),
                order,
                scheduleText: schedText,
            });
        } catch (notifyErr) {
            console.error('[OrderNotificationDispatcher] Erro ao notificar app na criação (best-effort):', notifyErr);
        }
    })();
};

/**
 * Dispara notificações ao atualizar um pedido (agendamento, montagens, áreas alteradas ou cancelamento).
 */
export const dispatchOrderUpdateNotifications = (
    orderId: string,
    previousOrderData: any,
    merged: Order,
    oldStatus?: Order['status'],
    newStatus?: Order['status']
): void => {
    const customerName = merged.customerData?.fullName || 'Cliente';
    const schedText = formatOrderSchedulingText(merged.shipping, merged);

    const isFromDraftOrNew = (!oldStatus || oldStatus === 'draft') && newStatus && newStatus !== 'draft';
    if (isFromDraftOrNew) {
        void notifyNewSaleAndAssemblies({ orderId: String(orderId), order: merged, scheduleText: schedText })
            .catch(err => console.error('[OrderNotificationDispatcher] Erro ao notificar pedido agendado:', err));
    }

    if (!isFromDraftOrNew && previousOrderData) {
        const previousKinds = new Set(getOrderAssemblyKinds(previousOrderData));
        const newKinds = getOrderAssemblyKinds(merged).filter(kind => !previousKinds.has(kind));
        if (newKinds.length > 0) {
            void notifyNewAssemblies({ orderId: String(orderId), order: merged, scheduleText: schedText, kinds: newKinds })
                .catch(err => console.error('[OrderNotificationDispatcher] Erro ao notificar nova montagem:', err));
        }
    }

    const changedAreas = detectOrderChangedAreas(previousOrderData, merged);
    if (changedAreas.length > 0 && shouldNotifyOrderChange(oldStatus)) {
        const notifData = formatOrderChangeNotification(customerName, changedAreas);
        void dispatchAppNotification({
            orderId: String(orderId),
            title: notifData.title,
            message: notifData.message,
            type: notifData.type,
            scheduleText: schedText,
            orderData: merged,
        }).catch(err => console.error('[OrderNotificationDispatcher] Erro ao notificar alteração do pedido:', err));
    }

    if (newStatus === 'cancelled') {
        void dispatchAppNotification({
            orderId: String(orderId),
            title: `Venda cancelada - ${customerName}`,
            message: `O pedido #${formatOrderCode(merged)} foi cancelado e a saída de estoque será estornada.`,
            type: 'order_edited',
            scheduleText: schedText,
            orderData: merged,
        }).catch(notificationErr => console.error('[OrderNotificationDispatcher] Erro ao notificar cancelamento:', notificationErr));
    }
};
