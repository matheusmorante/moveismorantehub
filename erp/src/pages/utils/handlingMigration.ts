import { HandlingOption } from './settingsService';

/** Opções genéricas do sistema que substituíram os manuseios reais da Morante */
export const GENERIC_HANDLING_LABELS = new Set([
    'Para Montar (Desmontado)',
    'Já Montado',
    'Montagem Fora',
    'Montagem no Local',
    'Manuseio Especial',
    'Entrega com montagem no local',
    'Na caixa com montagem',
    'Execução no local',
    'Standard',
    'stock',
]);

/** Mapeamento de rótulos legados/genéricos para os manuseios corretos */
const LEGACY_HANDLING_MAP: Record<string, string> = {
    'Montagem Fora': 'Na caixa > Montagem no local da entrega',
    'Montagem no Local': 'Na caixa > Montagem no local da entrega',
    'Entrega com montagem no local': 'Na caixa > Montagem no local da entrega',
    'Na caixa com montagem': 'Na caixa > Montagem no deposito > Entregue montado',
    'De mostruário que ja está montado': 'De mostruário montado > Entregue montado',
};

export const MORANTE_DELIVERY_HANDLING_OPTIONS: HandlingOption[] = [
    { label: 'Na caixa > Montagem no deposito > Entregue montado', includeInAssemblySchedule: true, isAssemblyOutside: false },
    { label: 'De mostruário montado > Entregue montado', includeInAssemblySchedule: false, isAssemblyOutside: false },
    { label: 'Na caixa > Montagem no local da entrega', includeInAssemblySchedule: false, isAssemblyOutside: true },
    { label: 'De mostruário > Desmontagem do mostruário > Montagem na entrega', includeInAssemblySchedule: true, isAssemblyOutside: true },
    { label: 'Na caixa > Montagem por conta do cliente', includeInAssemblySchedule: false, isAssemblyOutside: false },
    { label: 'Item não necessita de montagem', includeInAssemblySchedule: false, isAssemblyOutside: false },
    { label: 'De mostruario > Entregue desmontado para o cliente montar', includeInAssemblySchedule: false, isAssemblyOutside: false },
];

export const MORANTE_PICKUP_HANDLING_OPTIONS: HandlingOption[] = [
    { label: 'De caixa > Montagem para retirada', includeInAssemblySchedule: true, isAssemblyOutside: false },
    { label: 'De mostruário montado > Entregue montado', includeInAssemblySchedule: false, isAssemblyOutside: false },
    { label: 'De mostruário > Desmontagem do mostruário > Montagem na entrega', includeInAssemblySchedule: true, isAssemblyOutside: true },
    { label: 'Na caixa > Montagem por conta do cliente', includeInAssemblySchedule: false, isAssemblyOutside: false },
    { label: 'Item não necessita de montagem', includeInAssemblySchedule: false, isAssemblyOutside: false },
    { label: 'De mostruario > Entregue desmontado para o cliente montar', includeInAssemblySchedule: false, isAssemblyOutside: false },
];

const GENERIC_DEFAULT_LABELS = new Set([
    'Para Montar (Desmontado)',
    'Já Montado',
    'Montagem Fora',
    'Manuseio Especial',
]);

export const isGenericHandlingLabel = (label?: string): boolean => {
    const trimmed = (label || '').trim();
    return !trimmed || GENERIC_HANDLING_LABELS.has(trimmed);
};

export const resolveHandlingLabel = (label?: string): string => {
    const trimmed = (label || '').trim();
    if (!trimmed) return '';
    if (LEGACY_HANDLING_MAP[trimmed]) return LEGACY_HANDLING_MAP[trimmed];
    if (GENERIC_HANDLING_LABELS.has(trimmed)) return '';
    return trimmed;
};

/** Detecta se as configurações ainda usam apenas os padrões genéricos do sistema */
export const settingsUseGenericDefaults = (options: HandlingOption[] | undefined): boolean => {
    if (!options || options.length === 0) return true;
    const labels = options.map(o => o.label);
    const hasDetailedLabel = labels.some(l => l.includes('>'));
    if (hasDetailedLabel) return false;
    return labels.every(l => GENERIC_DEFAULT_LABELS.has(l) || l === 'Montagem no Local');
};

/**
 * Migra manuseios de um pedido: corrige rótulos genéricos e preenche itens
 * a partir de shipping.orderType quando este contém o manuseio correto.
 */
export const migrateOrderHandlings = <T extends {
    items?: Array<{ handlingType?: string; [key: string]: any }>;
    shipping?: { orderType?: string; deliveryMethod?: string; [key: string]: any };
}>(order: T): T => {
    if (!order.items?.length) return order;

    const shippingOrderType = resolveHandlingLabel(order.shipping?.orderType);
    const fallbackHandling = shippingOrderType || '';

    const migratedItems = order.items.map(item => {
        const current = resolveHandlingLabel(item.handlingType);
        if (current) return { ...item, handlingType: current };
        if (fallbackHandling) return { ...item, handlingType: fallbackHandling };
        return item;
    });

    const firstItemHandling = migratedItems.find(i => i.handlingType?.trim())?.handlingType || '';
    const migratedOrderType = resolveHandlingLabel(order.shipping?.orderType) || firstItemHandling;

    return {
        ...order,
        items: migratedItems,
        shipping: order.shipping
            ? { ...order.shipping, orderType: migratedOrderType || order.shipping.orderType || '' }
            : order.shipping,
    };
};
