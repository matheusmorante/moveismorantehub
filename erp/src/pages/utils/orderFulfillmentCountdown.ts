import Order from "../types/order.type";
import { updateOrder } from "./orderHistoryService";

export interface FulfillmentCountdown {
    isPastDelivery: boolean;
    daysPassed: number;
    daysRemaining: number;
    isExpired: boolean;
    countdownLabel: string;
}

const DEFAULT_AUTO_FULFILL_DAYS = 5;

/**
 * Converte a string de data de entrega do agendamento em objeto Date (à meia-noite).
 * Trata formatos "DD/MM/YYYY" e "YYYY-MM-DD", além de range de datas considerando a data final (endDate).
 */
export function parseOrderDeliveryDate(order: Order): Date | null {
    const sched = order.shipping?.scheduling;
    if (!sched || sched.pendingScheduling) return null;

    // Se for range e tiver data final, usa a data final como referência de conclusão da entrega
    const dateStr = (sched.dateType === 'range' && sched.endDate) 
        ? sched.endDate 
        : (sched.date || (order as any).scheduled_date || (order as any).scheduledDate || (order as any).order_data?.scheduledDate);

    if (!dateStr || typeof dateStr !== 'string') return null;

    try {
        const cleanDate = dateStr.split('T')[0].trim();
        const dateParts = cleanDate.includes('/') ? cleanDate.split('/') : cleanDate.split('-');
        
        if (dateParts.length !== 3) return null;

        const day = cleanDate.includes('/') ? Number(dateParts[0]) : Number(dateParts[2]);
        const month = cleanDate.includes('/') ? Number(dateParts[1]) : Number(dateParts[1]);
        const year = cleanDate.includes('/') ? Number(dateParts[2]) : Number(dateParts[0]);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

        const parsedDate = new Date(year, month - 1, day);
        parsedDate.setHours(0, 0, 0, 0);
        return parsedDate;
    } catch (e) {
        console.error("Erro ao converter data de entrega do pedido:", e);
        return null;
    }
}

/**
 * Calcula os dias passados desde a data de entrega, quantos dias faltam para os 5 dias de auto-atendimento
 * e gera o texto do subtítulo.
 */
export function getOrderFulfillmentCountdown(order: Order, maxDays = DEFAULT_AUTO_FULFILL_DAYS): FulfillmentCountdown {
    const defaultResult: FulfillmentCountdown = {
        isPastDelivery: false,
        daysPassed: 0,
        daysRemaining: maxDays,
        isExpired: false,
        countdownLabel: ''
    };

    const deliveryDate = parseOrderDeliveryDate(order);
    if (!deliveryDate) return defaultResult;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - deliveryDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
        return defaultResult;
    }

    const daysPassed = diffDays;
    const daysRemaining = Math.max(0, maxDays - daysPassed);
    const isExpired = daysRemaining <= 0;

    let countdownLabel = '';
    if (daysRemaining > 1) {
        countdownLabel = `Atendido em ${daysRemaining} dias`;
    } else if (daysRemaining === 1) {
        countdownLabel = `Atendido em 1 dia`;
    } else {
        countdownLabel = `Atendido hoje`;
    }

    return {
        isPastDelivery: true,
        daysPassed,
        daysRemaining,
        isExpired,
        countdownLabel
    };
}

// Conjunto para evitar disparos concorrentes duplicados no mesmo ciclo de vida
const inFlightAutoFulfillOrders = new Set<string>();

/**
 * Identifica pedidos cuja data de entrega passou há 5 dias ou mais e que ainda não foram marcados como atendidos,
 * setando o status como 'fulfilled' automaticamente.
 */
export async function autoFulfillExpiredOrders(
    orders: Order[],
    onOrderFulfilled?: (order: Order) => void
): Promise<void> {
    const expiredOrders = orders.filter(order => {
        if (!order.id) return false;
        if (order.deleted || order.status === 'fulfilled' || order.status === 'cancelled' || order.status === 'draft') {
            return false;
        }
        if (inFlightAutoFulfillOrders.has(order.id)) {
            return false;
        }

        const countdown = getOrderFulfillmentCountdown(order);
        return countdown.isPastDelivery && countdown.isExpired;
    });

    if (expiredOrders.length === 0) return;

    for (const order of expiredOrders) {
        if (!order.id) continue;
        inFlightAutoFulfillOrders.add(order.id);

        try {
            console.log(`[AutoFulfill] Pedido #${order.id} atingiu o limite de 5 dias após entrega. Marcando como atendido...`);
            await updateOrder(order.id, { status: 'fulfilled' }, order);
            onOrderFulfilled?.(order);
        } catch (err) {
            console.error(`[AutoFulfill] Falha ao marcar pedido #${order.id} como atendido:`, err);
        } finally {
            inFlightAutoFulfillOrders.delete(order.id);
        }
    }
}
