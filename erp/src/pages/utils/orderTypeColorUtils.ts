import { OrderTypeColor } from '@/pages/utils/settingsService';

export interface OrderTypeColorClasses {
    badge: string;          // fundo + texto + borda do badge/rótulo
    cardBg: string;         // fundo suave do card
    cardBorder: string;     // borda do card
    headerBg: string;       // fundo do cabeçalho do card
    timeText: string;       // cor do texto de tempo
    dotBg: string;          // bolinha colorida sólida (badge "Período")
    handleHover: string;    // hover do handle de drag
    rowHover: string;       // hover da linha da tabela ou card
    rowActive: string;      // estilo quando selecionado
}

const COLOR_MAP: Record<OrderTypeColor, OrderTypeColorClasses> = {
    orange: {
        badge:       'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
        cardBg:      'bg-orange-50/20 dark:bg-orange-900/5',
        cardBorder:  'border-orange-100 dark:border-orange-900/30 hover:border-orange-400 dark:hover:border-orange-500',
        headerBg:    'bg-orange-50/80 dark:bg-orange-900/10 group-hover:bg-orange-100/50 dark:group-hover:bg-orange-900/20',
        timeText:    'text-orange-600 dark:text-orange-400',
        dotBg:       'bg-orange-600 dark:bg-orange-500 text-white',
        handleHover: 'hover:text-orange-600 dark:hover:text-orange-400',
        rowHover:    'bg-orange-50/20 dark:bg-orange-900/5 hover:bg-orange-50/40 dark:hover:bg-orange-900/10',
        rowActive:   'ring-2 ring-orange-500',
    },
    purple: {
        badge:       'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
        cardBg:      'bg-purple-50/30 dark:bg-purple-900/10',
        cardBorder:  'border-purple-200 dark:border-purple-800/50 hover:border-purple-500 dark:hover:border-purple-400',
        headerBg:    'bg-purple-100/50 dark:bg-purple-900/20 group-hover:bg-purple-200/50 dark:group-hover:bg-purple-900/40',
        timeText:    'text-purple-800 dark:text-purple-300 font-bold',
        dotBg:       'bg-purple-700 dark:bg-purple-500 text-white',
        handleHover: 'hover:text-purple-700 dark:hover:text-purple-400',
        rowHover:    'bg-purple-50/40 dark:bg-purple-900/10 hover:bg-purple-100/40 dark:hover:bg-purple-900/20',
        rowActive:   'ring-2 ring-purple-600',
    },
    green: {
        badge:       'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30',
        cardBg:      'bg-green-50/20 dark:bg-green-900/5',
        cardBorder:  'border-green-600 dark:border-green-500 hover:border-green-700 dark:hover:border-green-400',
        headerBg:    'bg-green-50/80 dark:bg-green-900/10 group-hover:bg-green-100/50 dark:group-hover:bg-green-900/20',
        timeText:    'text-green-700 dark:text-green-400',
        dotBg:       'bg-green-600 dark:bg-green-500 text-white',
        handleHover: 'hover:text-green-600 dark:hover:text-green-400',
        rowHover:    'bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/40',
        rowActive:   'ring-2 ring-green-600',
    },
    blue: {
        badge:       'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
        cardBg:      'bg-blue-50/20 dark:bg-blue-900/5',
        cardBorder:  'border-blue-100 dark:border-blue-900/30 hover:border-blue-400 dark:hover:border-blue-500',
        headerBg:    'bg-blue-50/80 dark:bg-blue-900/10 group-hover:bg-blue-100/50 dark:group-hover:bg-blue-900/20',
        timeText:    'text-blue-600 dark:text-blue-400',
        dotBg:       'bg-blue-600 dark:bg-blue-500 text-white',
        handleHover: 'hover:text-blue-600 dark:hover:text-blue-400',
        rowHover:    'bg-blue-50/20 dark:bg-blue-900/5 hover:bg-blue-50/40 dark:hover:bg-blue-900/10',
        rowActive:   'ring-2 ring-blue-500',
    },
    amber: {
        badge:       'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
        cardBg:      'bg-amber-50/20 dark:bg-amber-900/5',
        cardBorder:  'border-amber-100 dark:border-amber-900/30 hover:border-amber-400 dark:hover:border-amber-500',
        headerBg:    'bg-amber-50/80 dark:bg-amber-900/10 group-hover:bg-amber-100/50 dark:group-hover:bg-amber-900/20',
        timeText:    'text-amber-600 dark:text-amber-400',
        dotBg:       'bg-amber-600 dark:bg-amber-500 text-white',
        handleHover: 'hover:text-amber-600 dark:hover:text-amber-400',
        rowHover:    'bg-amber-50/20 dark:bg-amber-900/5 hover:bg-amber-50/40 dark:hover:bg-amber-900/10',
        rowActive:   'ring-2 ring-amber-500',
    },
    rose: {
        badge:       'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
        cardBg:      'bg-rose-50/20 dark:bg-rose-900/5',
        cardBorder:  'border-rose-100 dark:border-rose-900/30 hover:border-rose-400 dark:hover:border-rose-500',
        headerBg:    'bg-rose-50/80 dark:bg-rose-900/10 group-hover:bg-rose-100/50 dark:group-hover:bg-rose-900/20',
        timeText:    'text-rose-600 dark:text-rose-400',
        dotBg:       'bg-rose-600 dark:bg-rose-500 text-white',
        handleHover: 'hover:text-rose-600 dark:hover:text-rose-400',
        rowHover:    'bg-rose-50/20 dark:bg-rose-900/5 hover:bg-rose-50/40 dark:hover:bg-rose-900/10',
        rowActive:   'ring-2 ring-rose-500',
    },
    indigo: {
        badge:       'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
        cardBg:      'bg-indigo-50/20 dark:bg-indigo-900/5',
        cardBorder:  'border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-400 dark:hover:border-indigo-500',
        headerBg:    'bg-indigo-50/80 dark:bg-indigo-900/10 group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-900/20',
        timeText:    'text-indigo-600 dark:text-indigo-400',
        dotBg:       'bg-indigo-600 dark:bg-indigo-500 text-white',
        handleHover: 'hover:text-indigo-600 dark:hover:text-indigo-400',
        rowHover:    'bg-indigo-50/20 dark:bg-indigo-900/5 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10',
        rowActive:   'ring-2 ring-indigo-500',
    },
    emerald: {
        badge:       'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
        cardBg:      'bg-emerald-50/20 dark:bg-emerald-900/5',
        cardBorder:  'border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-400 dark:hover:border-emerald-500',
        headerBg:    'bg-emerald-50/80 dark:bg-emerald-900/10 group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-900/20',
        timeText:    'text-emerald-600 dark:text-emerald-400',
        dotBg:       'bg-emerald-600 dark:bg-emerald-500 text-white',
        handleHover: 'hover:text-emerald-600 dark:hover:text-emerald-400',
        rowHover:    'bg-emerald-50/20 dark:bg-emerald-900/5 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10',
        rowActive:   'ring-2 ring-emerald-500',
    },
    cyan: {
        badge:       'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/30',
        cardBg:      'bg-cyan-50/20 dark:bg-cyan-900/5',
        cardBorder:  'border-cyan-100 dark:border-cyan-900/30 hover:border-cyan-400 dark:hover:border-cyan-500',
        headerBg:    'bg-cyan-50/80 dark:bg-cyan-900/10 group-hover:bg-cyan-100/50 dark:group-hover:bg-cyan-900/20',
        timeText:    'text-cyan-600 dark:text-cyan-400',
        dotBg:       'bg-cyan-600 dark:bg-cyan-500 text-white',
        handleHover: 'hover:text-cyan-600 dark:hover:text-cyan-400',
        rowHover:    'bg-cyan-50/20 dark:bg-cyan-900/5 hover:bg-cyan-50/40 dark:hover:bg-cyan-900/10',
        rowActive:   'ring-2 ring-cyan-500',
    },
    pink: {
        badge:       'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900/30',
        cardBg:      'bg-pink-50/20 dark:bg-pink-900/5',
        cardBorder:  'border-pink-100 dark:border-pink-900/30 hover:border-pink-400 dark:hover:border-pink-500',
        headerBg:    'bg-pink-50/80 dark:bg-pink-900/10 group-hover:bg-pink-100/50 dark:group-hover:bg-pink-900/20',
        timeText:    'text-pink-600 dark:text-pink-400',
        dotBg:       'bg-pink-600 dark:bg-pink-500 text-white',
        handleHover: 'hover:text-pink-600 dark:hover:text-pink-400',
        rowHover:    'bg-pink-50/20 dark:bg-pink-900/5 hover:bg-pink-50/40 dark:hover:bg-pink-900/10',
        rowActive:   'ring-2 ring-pink-500',
    },
};

export const getOrderTypeClasses = (color: OrderTypeColor): OrderTypeColorClasses => {
    return COLOR_MAP[color] ?? COLOR_MAP['green'];
};

/** Resolve the color key for an order based on its type/delivery method */
export const resolveOrderColor = (
    orderType: string | undefined,
    deliveryMethod: string | undefined,
    colors: { delivery: OrderTypeColor; pickup: OrderTypeColor; assistance: OrderTypeColor }
): OrderTypeColor => {
    if (orderType === 'showroom') return 'rose';
    if (orderType === 'assistance') return colors.assistance;
    if (deliveryMethod === 'pickup') return colors.pickup;
    return colors.delivery;
};

/** Dot colors for the simple color swatches in settings */
export const ORDER_TYPE_COLOR_OPTIONS: { value: OrderTypeColor; label: string; dotClass: string }[] = [
    { value: 'orange',  label: 'Laranja',  dotClass: 'bg-orange-500' },
    { value: 'purple',  label: 'Roxo',     dotClass: 'bg-purple-500' },
    { value: 'green',   label: 'Verde',    dotClass: 'bg-green-500' },
    { value: 'blue',    label: 'Azul',     dotClass: 'bg-blue-500' },
    { value: 'amber',   label: 'Âmbar',   dotClass: 'bg-amber-500' },
    { value: 'rose',    label: 'Rosa',     dotClass: 'bg-rose-500' },
    { value: 'indigo',  label: 'Índigo',  dotClass: 'bg-indigo-500' },
    { value: 'emerald', label: 'Esmeralda',dotClass: 'bg-emerald-500' },
    { value: 'cyan',    label: 'Ciano',    dotClass: 'bg-cyan-500' },
    { value: 'pink',    label: 'Rosa-choque', dotClass: 'bg-pink-500' },
];

/** 
 * Centralized logic to detect assembly needs and the most relevant handling label.
 * Prioritizes assembly-required items over others.
 */
export const getPrimaryHandlingInfo = (order: any, settings: any) => {
    const allOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    const getOpt = (hType: string) => {
        const hLabel = (hType || "").trim().toLowerCase();
        if (!hLabel) return null;
        
        // Try exact match first
        let opt = allOptions.find(o => (o.label || "").trim().toLowerCase() === hLabel);
        
        // Fallback: If no match but contains "montagem", treat as assembly (resilience for data drift)
        if (!opt && hLabel.includes('montagem')) {
            return { label: hType, includeInAssemblySchedule: true };
        }
        
        return opt;
    };

    const items = [...(order.items || []), ...(order.assistanceItems || [])];
    
    // 1. Find the first item that specifically requires assembly
    const assemblyItem = items.find(i => getOpt(i.handlingType)?.includeInAssemblySchedule);
    
    if (assemblyItem) {
        return {
            hasAssembly: true,
            label: assemblyItem.handlingType
        };
    }

    // 2. Fallback: check global shipping type
    const globalOpt = getOpt(order.shipping?.orderType);
    if (globalOpt?.includeInAssemblySchedule) {
        return {
            hasAssembly: true,
            label: order.shipping.orderType
        };
    }

    // 3. No assembly detected
    return {
        hasAssembly: false,
        label: items[0]?.handlingType || order.shipping?.orderType
    };
};
