import Order from '../types/order.type';
import { dispatchAppNotification } from './pushNotificationService';
import { getSettings } from './settingsService';

type AssemblyKind = 'outside' | 'depot';

const normalize = (value?: string) => (value || '').trim().toLocaleLowerCase('pt-BR');

export const getOrderAssemblyKinds = (order: Order): AssemblyKind[] => {
    const settings = getSettings();
    const options = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || []),
    ];
    const items = [...(order.items || []), ...((order as any).assistanceItems || [])];
    const kinds = new Set<AssemblyKind>();

    if (order.orderType === 'showroom') kinds.add('depot');

    items.forEach((item: any) => {
        const handling = normalize(item?.handlingType);
        if (!handling) return;

        const option = options.find(candidate => normalize(candidate?.label) === handling);
        if (option?.isAssemblyOutside) {
            kinds.add('outside');
            return;
        }
        if (option?.includeInAssemblySchedule) {
            kinds.add('depot');
            return;
        }

        if (handling.includes('fora') || handling.includes('cliente') || handling.includes('extern')) {
            kinds.add('outside');
        } else if (handling.includes('montagem') || handling.includes('montado')) {
            kinds.add('depot');
        }
    });

    return [...kinds];
};

interface NewOrderNotificationOptions {
    orderId: string;
    order: Order;
    scheduleText?: string;
}

interface AssemblyNotificationOptions extends NewOrderNotificationOptions {
    kinds?: AssemblyKind[];
}

export const notifyNewAssemblies = async ({
    orderId,
    order,
    scheduleText,
    kinds = getOrderAssemblyKinds(order),
}: AssemblyNotificationOptions) => {
    const customerName = order.customerData?.fullName || 'Cliente';

    await Promise.all(kinds.map(kind => {
        const outside = kind === 'outside';
        return dispatchAppNotification({
            orderId,
            title: outside
                ? `🔨 Nova montagem fora - ${customerName}`
                : `🔨 Nova montagem no depósito - ${customerName}`,
            message: outside
                ? 'Uma nova montagem fora entrou na lista de montagens.'
                : 'Uma nova montagem no depósito entrou na lista de montagens.',
            type: outside ? 'assembly_outside' : 'assembly_depot',
            scheduleText,
            orderData: order,
        });
    }));
};

export const notifyNewSaleAndAssemblies = async ({
    orderId,
    order,
    scheduleText,
}: NewOrderNotificationOptions) => {
    const customerName = order.customerData?.fullName || 'Cliente';
    const itemsCount = (order.items || []).length;
    const notifications: Promise<void>[] = [];

    if (!order.orderType || order.orderType === 'sale') {
        notifications.push(dispatchAppNotification({
            orderId,
            title: `🛒 Nova venda - ${customerName}`,
            message: `Pedido #${orderId} cadastrado no sistema (${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}).`,
            type: 'order_created',
            scheduleText,
            orderData: order,
        }));
    }

    await Promise.all(notifications);
    await notifyNewAssemblies({ orderId, order, scheduleText });
};
