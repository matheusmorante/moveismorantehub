// Utilitário central de mapeamento e categorização de módulos do Morante Hub para telemetria de APIs

export interface ModuleDefinition {
    id: string;
    label: string;
    icon: string;
    color: string;
}

export const KNOWN_MODULES: Record<string, ModuleDefinition> = {
    products: {
        id: 'products',
        label: 'Produtos & Catálogo',
        icon: 'bi-box-seam',
        color: 'bg-indigo-600 text-white',
    },
    inbound_invoices: {
        id: 'inbound_invoices',
        label: 'Notas Fiscais de Entrada',
        icon: 'bi-file-earmark-arrow-down',
        color: 'bg-emerald-600 text-white',
    },
    marketing: {
        id: 'marketing',
        label: 'Marketing & Criador de Posts',
        icon: 'bi-stars',
        color: 'bg-purple-600 text-white',
    },
    logistics: {
        id: 'logistics',
        label: 'Logística & Rotas',
        icon: 'bi-truck',
        color: 'bg-blue-600 text-white',
    },
    financial: {
        id: 'financial',
        label: 'Financeiro & Caixa',
        icon: 'bi-cash-coin',
        color: 'bg-emerald-500 text-white',
    },
    sales_order: {
        id: 'sales_order',
        label: 'Vendas & Pedidos',
        icon: 'bi-cart-check',
        color: 'bg-amber-600 text-white',
    },
    fiscal: {
        id: 'fiscal',
        label: 'Fiscal & Tributação (NF-e)',
        icon: 'bi-receipt',
        color: 'bg-rose-600 text-white',
    },
    receipts: {
        id: 'receipts',
        label: 'Recebimento & Estoque',
        icon: 'bi-inboxes',
        color: 'bg-teal-600 text-white',
    },
    communication: {
        id: 'communication',
        label: 'WhatsApp & Mensagens',
        icon: 'bi-whatsapp',
        color: 'bg-green-600 text-white',
    },
    ai_assistant: {
        id: 'ai_assistant',
        label: 'Assistente Geral IA',
        icon: 'bi-robot',
        color: 'bg-violet-600 text-white',
    },
    general: {
        id: 'general',
        label: 'Operações Gerais',
        icon: 'bi-cpu',
        color: 'bg-slate-500 text-white',
    },
};

export function inferModuleFromOperation(operation: string = ''): string {
    const op = operation.toLowerCase();

    if (op.startsWith('marketing_') || op.startsWith('post_') || op.includes('ambientation') || op.includes('composition')) {
        return 'marketing';
    }
    if (op.includes('inbound') || op.includes('invoice') || op.includes('classify_item') || op.includes('supplier_context')) {
        return 'inbound_invoices';
    }
    if (op.includes('product') || op.includes('category') || op.includes('title') || op.includes('dimensions') || op.includes('attributes') || op.includes('ecommerce_seo')) {
        return 'products';
    }
    if (op.includes('fiscal') || op.includes('ncm') || op.includes('sefaz') || op.includes('tax')) {
        return 'fiscal';
    }
    if (op.includes('route') || op.includes('delivery') || op.includes('map') || op.includes('geocod') || op.includes('place')) {
        return 'logistics';
    }
    if (op.includes('order') || op.includes('sales') || op.includes('extract_order')) {
        return 'sales_order';
    }
    if (op.includes('financial') || op.includes('transaction') || op.includes('caixa')) {
        return 'financial';
    }
    if (op.includes('receipt') || op.includes('conference')) {
        return 'receipts';
    }
    if (op.includes('whatsapp') || op.includes('message')) {
        return 'communication';
    }
    if (op.includes('agent') || op.includes('chat') || op.includes('assistant')) {
        return 'ai_assistant';
    }
    return 'general';
}

export function getModuleDefinition(moduleId: string = 'general'): ModuleDefinition {
    return KNOWN_MODULES[moduleId] || {
        id: moduleId,
        label: moduleId.charAt(0).toUpperCase() + moduleId.slice(1).replace(/_/g, ' '),
        icon: 'bi-app',
        color: 'bg-slate-500 text-white',
    };
}
