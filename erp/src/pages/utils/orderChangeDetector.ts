import Order from '../types/order.type';

/**
 * Compara dois objetos para verificar se houve alteração nos dados do cliente
 */
const hasCustomerDataChanged = (oldCust?: any, newCust?: any): boolean => {
    if (!oldCust && !newCust) return false;
    if (!oldCust || !newCust) return true;

    if ((oldCust.fullName || '').trim() !== (newCust.fullName || '').trim()) return true;
    if ((oldCust.phone || '').trim() !== (newCust.phone || '').trim()) return true;
    if ((oldCust.document || '').trim() !== (newCust.document || '').trim()) return true;
    if ((oldCust.rg || '').trim() !== (newCust.rg || '').trim()) return true;
    if ((oldCust.email || '').trim() !== (newCust.email || '').trim()) return true;

    // Endereço
    const oldAddr = oldCust.fullAddress || {};
    const newAddr = newCust.fullAddress || {};
    if ((oldAddr.street || '').trim() !== (newAddr.street || '').trim()) return true;
    if ((oldAddr.number || '').trim() !== (newAddr.number || '').trim()) return true;
    if ((oldAddr.neighborhood || '').trim() !== (newAddr.neighborhood || '').trim()) return true;
    if ((oldAddr.city || '').trim() !== (newAddr.city || '').trim()) return true;
    if ((oldAddr.state || '').trim() !== (newAddr.state || '').trim()) return true;
    if ((oldAddr.cep || '').trim() !== (newAddr.cep || '').trim()) return true;
    if ((oldAddr.complement || '').trim() !== (newAddr.complement || '').trim()) return true;
    if ((oldAddr.referencePoint || '').trim() !== (newAddr.referencePoint || '').trim()) return true;

    // Contatos adicionais
    const oldContacts = JSON.stringify(oldCust.additionalContacts || []);
    const newContacts = JSON.stringify(newCust.additionalContacts || []);
    if (oldContacts !== newContacts) return true;

    return false;
};

/**
 * Compara dois objetos para verificar se houve alteração no agendamento / entrega
 */
const hasSchedulingChanged = (oldShipping?: any, newShipping?: any): boolean => {
    if (!oldShipping && !newShipping) return false;
    if (!oldShipping || !newShipping) return true;

    const oldSched = oldShipping.scheduling || {};
    const newSched = newShipping.scheduling || {};

    if ((oldSched.date || '') !== (newSched.date || '')) return true;
    if ((oldSched.endDate || '') !== (newSched.endDate || '')) return true;
    if ((oldSched.dateType || '') !== (newSched.dateType || '')) return true;
    if ((oldSched.time || '') !== (newSched.time || '')) return true;
    if ((oldSched.startTime || '') !== (newSched.startTime || '')) return true;
    if ((oldSched.endTime || '') !== (newSched.endTime || '')) return true;
    if ((oldSched.type || '') !== (newSched.type || '')) return true;
    if (Boolean(oldSched.notInformed) !== Boolean(newSched.notInformed)) return true;

    if ((oldShipping.deliveryMethod || '') !== (newShipping.deliveryMethod || '')) return true;
    if (Number(oldShipping.value || 0) !== Number(newShipping.value || 0)) return true;

    return false;
};

/**
 * Compara se houve alteração nos itens do pedido
 */
const haveItemsChanged = (oldOrder?: any, newOrder?: any): boolean => {
    const oldItems = [...(oldOrder?.items || []), ...(oldOrder?.assistanceItems || [])];
    const newItems = [...(newOrder?.items || []), ...(newOrder?.assistanceItems || [])];

    if (oldItems.length !== newItems.length) return true;

    for (let i = 0; i < oldItems.length; i++) {
        const o = oldItems[i] || {};
        const n = newItems[i] || {};
        if ((o.id || o.code || '') !== (n.id || n.code || '')) return true;
        if ((o.description || '') !== (n.description || '')) return true;
        if (Number(o.quantity || 0) !== Number(n.quantity || 0)) return true;
        if (Number(o.unitPrice || 0) !== Number(n.unitPrice || 0)) return true;
        if (Number(o.unitDiscount || 0) !== Number(n.unitDiscount || 0)) return true;
        if ((o.handlingType || '') !== (n.handlingType || '')) return true;
        if ((o.selectedVariationId || '') !== (n.selectedVariationId || '')) return true;
    }

    return false;
};

/**
 * Compara se houve alteração no pagamento / financeiro
 */
const havePaymentsChanged = (oldOrder?: any, newOrder?: any): boolean => {
    const oldPayments = oldOrder?.payments || [];
    const newPayments = newOrder?.payments || [];

    if (oldPayments.length !== newPayments.length) return true;

    const oldSummary = oldOrder?.paymentsSummary || {};
    const newSummary = newOrder?.paymentsSummary || {};

    if (Number(oldSummary.totalOrderValue || 0) !== Number(newSummary.totalOrderValue || 0)) return true;

    for (let i = 0; i < oldPayments.length; i++) {
        const o = oldPayments[i] || {};
        const n = newPayments[i] || {};
        if ((o.paymentMethod || '') !== (n.paymentMethod || '')) return true;
        if (Number(o.value || 0) !== Number(n.value || 0)) return true;
        if (Number(o.installments || 1) !== Number(n.installments || 1)) return true;
    }

    return false;
};

/**
 * Compara se houve alteração nas observações
 */
const haveObservationsChanged = (oldOrder?: any, newOrder?: any): boolean => {
    const oldObs = (oldOrder?.observation || oldOrder?.observations || oldOrder?.assistanceDescription || oldOrder?.notes || '').trim();
    const newObs = (newOrder?.observation || newOrder?.observations || newOrder?.assistanceDescription || newOrder?.notes || '').trim();
    return oldObs !== newObs;
};

/**
 * Detecta todas as áreas alteradas entre o pedido anterior e o pedido novo
 */
export const detectOrderChangedAreas = (oldOrder?: Order, newOrder?: Order): string[] => {
    if (!oldOrder || !newOrder) return [];

    const changedAreas: string[] = [];

    if (haveItemsChanged(oldOrder, newOrder)) {
        changedAreas.push('itens');
    }

    if (hasSchedulingChanged(oldOrder.shipping, newOrder.shipping)) {
        changedAreas.push('agendamento');
    }

    if (haveObservationsChanged(oldOrder, newOrder)) {
        changedAreas.push('observações');
    }

    if (havePaymentsChanged(oldOrder, newOrder)) {
        changedAreas.push('pagamento');
    }

    if (hasCustomerDataChanged(oldOrder.customerData, newOrder.customerData)) {
        changedAreas.push('informações do cliente');
    }

    return changedAreas;
};

/** Alteration alerts are operational alerts: only a previously scheduled order can trigger one. */
export const shouldNotifyOrderChange = (previousStatus?: string): boolean => (
    previousStatus === 'scheduled' || previousStatus === 'agendado'
);

/**
 * Formata o texto da notificação mencionando a área única ou múltiplas áreas
 */
export const formatOrderChangeNotification = (
    customerName: string,
    changedAreas: string[]
): { title: string; message: string; type: 'order_schedule_changed' | 'order_edited' } => {
    const name = customerName || 'Cliente';

    // Se nenhuma área específica for detectada (fallback)
    if (changedAreas.length === 0) {
        return {
            title: `✏️ Pedido Alterado - ${name}`,
            message: `O pedido de ${name} foi alterado no sistema.`,
            type: 'order_edited'
        };
    }

    // Se for apenas 1 área alterada
    if (changedAreas.length === 1) {
        const area = changedAreas[0];
        if (area === 'agendamento') {
            return {
                title: `📅 Agendamento Alterado - ${name}`,
                message: `Alteração no agendamento do pedido de ${name}.`,
                type: 'order_schedule_changed'
            };
        }

        return {
            title: `✏️ Pedido Alterado - ${name}`,
            message: `Alteração em ${area} no pedido de ${name}.`,
            type: 'order_edited'
        };
    }

    // Se forem 2 ou mais áreas alteradas
    const lastArea = changedAreas[changedAreas.length - 1];
    const firstAreas = changedAreas.slice(0, -1).join(', ');
    const areasText = `${firstAreas} e ${lastArea}`;

    return {
        title: `✏️ Pedido Alterado - ${name}`,
        message: `Alterações em ${areasText} no pedido de ${name}.`,
        type: changedAreas.includes('agendamento') ? 'order_schedule_changed' : 'order_edited'
    };
};
