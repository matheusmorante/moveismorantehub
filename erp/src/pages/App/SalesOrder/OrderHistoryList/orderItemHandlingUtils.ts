import Order from "../../../types/order.type";

export const normalizeHandlingText = (str: string): string =>
    (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const getMatchingHandlingOption = (hLabel: string, allOptions: any[]): any | null => {
    if (!hLabel) return null;
    const normalized = normalizeHandlingText(hLabel);
    return allOptions.find(o => {
        const sLabel = normalizeHandlingText(o?.label);
        return sLabel === normalized || (sLabel && (normalized.includes(sLabel) || sLabel.includes(normalized)));
    }) || null;
};

export const isHandlingDepotItem = (item: any, allOptions: any[]): boolean => {
    const hLabel = normalizeHandlingText(item?.handlingType || item?.handling);
    const opt = getMatchingHandlingOption(hLabel, allOptions);
    if (opt?.includeInAssemblySchedule) return true;
    if (hLabel.includes('montagem no deposito') || hLabel.includes('montagem para retirada') || hLabel.includes('montagem no depósito')) return true;
    return false;
};

export const isHandlingOutsideItem = (item: any, allOptions: any[]): boolean => {
    const hLabel = normalizeHandlingText(item?.handlingType || item?.handling);
    const opt = getMatchingHandlingOption(hLabel, allOptions);
    if (opt?.isAssemblyOutside) return true;
    if (hLabel.includes('montagem na entrega') || hLabel.includes('montagem fora') || hLabel.includes('montagem no endereco') || hLabel.includes('montagem no local')) return true;
    return false;
};

export const getOrderAssemblyFlags = (order: Order, settings: any): { hasAssemblyDepot: boolean; hasAssemblyOutside: boolean } => {
    const allOptions = [
        ...(settings?.deliveryHandlingOptions || []),
        ...(settings?.pickupHandlingOptions || [])
    ];
    const allOrderItems = [...(order.items || []), ...(order.assistanceItems || [])];
    const orderHandling = normalizeHandlingText(
        (order as any).handlingType || (order as any).handling ||
        (order.shipping as any)?.handlingType || (order.shipping as any)?.handling || ''
    );
    const isOrderAssemblyOutside = orderHandling.includes('montagem fora') || orderHandling.includes('montagem na entrega') || orderHandling.includes('montagem no endereco');
    const isOrderAssemblyDepot = orderHandling.includes('montagem no deposito') || orderHandling.includes('montagem para retirada') || orderHandling.includes('montagem no depósito');

    const hasAssemblyOutside = isOrderAssemblyOutside || allOrderItems.some(item => isHandlingOutsideItem(item, allOptions));
    const hasAssemblyDepot = isOrderAssemblyDepot || allOrderItems.some(item => isHandlingDepotItem(item, allOptions));

    return { hasAssemblyDepot, hasAssemblyOutside };
};

export const isPaidTrafficOrder = (order: Order): boolean => {
    const mOrigin1 = (order.marketingOrigin || "").toLowerCase();
    const mOrigin2 = (((order as any).customerData?.marketingOrigin) || "").toLowerCase();
    return (
        mOrigin1 === 'paid' || mOrigin1.includes('pago') || mOrigin1.includes('ads') || mOrigin1.includes('facebook') || mOrigin1.includes('insta') || mOrigin1.includes('trafego') || mOrigin1.includes('tráfego') ||
        mOrigin2 === 'paid' || mOrigin2.includes('pago') || mOrigin2.includes('ads') || mOrigin2.includes('facebook') || mOrigin2.includes('insta') || mOrigin2.includes('trafego') || mOrigin2.includes('tráfego')
    );
};
