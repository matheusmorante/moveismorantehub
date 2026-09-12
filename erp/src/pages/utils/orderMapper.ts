import Order, { OrderType } from '../types/order.type';
import { capitalizeOrder } from './formatters';

export interface OrderDatabaseRow {
    id: string;
    order_number?: string | null;
    order_index?: number | null;
    status?: string | null;
    order_type?: string | null;
    customer_id?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    seller_id?: string | null;
    seller_name?: string | null;
    total_amount?: number | null;
    payment_method?: string | null;
    channel?: string | null;
    notes?: string | null;
    scheduled_date?: string | null;
    scheduled_start_time?: string | null;
    scheduled_end_time?: string | null;
    delivery_method?: string | null;
    delivery_status?: string | null;
    delivery_arrived_at?: string | null;
    delivery_started_at?: string | null;
    delivery_finished_at?: string | null;
    marketing_origin?: string | null;
    items_subtotal?: number | null;
    total_discount?: number | null;
    total_cost?: number | null;
    stock_processed?: boolean | null;
    is_stock_checked?: boolean | null;
    is_registered_in_bling?: boolean | null;
    deleted?: boolean | null;
    deleted_at?: string | null;
    return_order_id?: string | null;
    linked_order_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    items?: any[] | null;
    order_items?: any[] | null;
    order_payments?: any[] | null;
    order_data?: any | null;
}

/**
 * Mapper Canônico: Converte a linha bruta do banco Supabase para o modelo de domínio Order.
 * Regra: As colunas estruturadas são a FONTE DE VERDADE (Master).
 * O objeto order_data é consumido apenas para snapshots históricos ou fallback temporário.
 */
export function mapOrderFromDatabase(row: OrderDatabaseRow): Order {
    const rawLegacy = (row.order_data && typeof row.order_data === 'object' && !Array.isArray(row.order_data)) 
        ? row.order_data 
        : {};

    const id = String(row.id || rawLegacy.id || '');
    
    // Status: Fonte de verdade é row.status
    const status = (row.status || rawLegacy.status || 'draft').trim();

    // Tipo de pedido
    const orderType = (row.order_type || rawLegacy.orderType || 'sale') as OrderType;

    // Número e índice do pedido
    const rawNumber = row.order_index ?? (
        row.order_number != null && !isNaN(Number(row.order_number)) ? Number(row.order_number) : (
            rawLegacy.orderIndex ?? (rawLegacy.orderNumber ? Number(rawLegacy.orderNumber) : undefined)
        )
    );
    const orderIndex = rawNumber != null ? Number(rawNumber) : undefined;
    const orderNumber = orderIndex;

    // Valores financeiros
    const totalAmount = row.total_amount != null ? Number(row.total_amount) : Number(rawLegacy.totalAmount || rawLegacy.total || 0);

    // Resumo de pagamentos
    const legacySummary = rawLegacy.paymentsSummary || {};
    const paymentsSummary = {
        totalOrderValue: totalAmount,
        totalItemsCost: row.total_cost != null ? Number(row.total_cost) : (legacySummary.totalItemsCost ?? 0),
        itemsSubtotal: row.items_subtotal != null ? Number(row.items_subtotal) : (legacySummary.itemsSubtotal ?? totalAmount),
        totalFixedDiscount: row.total_discount != null ? Number(row.total_discount) : (legacySummary.totalFixedDiscount ?? 0),
        itemsTotalValue: totalAmount,
        totalAmountPaid: legacySummary.totalAmountPaid ?? totalAmount,
        amountRemaining: legacySummary.amountRemaining ?? 0,
        totalPaymentsFee: legacySummary.totalPaymentsFee ?? 0
    };

    // Vendedor
    const seller = row.seller_name || rawLegacy.seller || '';
    const sellerId = row.seller_id || rawLegacy.sellerId || undefined;

    // Itens: Prioridade absoluta para tabela normalizada order_items, depois row.items (coluna JSONB), e fallback para rawLegacy.items
    let items: any[] = [];
    if (Array.isArray(row.order_items) && row.order_items.length > 0) {
        items = row.order_items.map((item: any) => {
            const snapshot = item.item_snapshot || {};
            return {
                ...snapshot,
                id: item.id || snapshot.id,
                productId: item.product_id || snapshot.productId || '',
                variationId: item.variation_id || snapshot.variationId || undefined,
                code: item.code || snapshot.code || '',
                description: item.description || snapshot.description || '',
                quantity: item.quantity != null ? Number(item.quantity) : Number(snapshot.quantity || 1),
                unitPrice: item.unit_price != null ? Number(item.unit_price) : Number(snapshot.unitPrice || 0),
                unitDiscount: item.unit_discount != null ? Number(item.unit_discount) : Number(snapshot.unitDiscount || 0),
                discountType: item.discount_type || snapshot.discountType || 'fixed',
                costPrice: item.cost_price != null ? Number(item.cost_price) : (snapshot.costPrice != null ? Number(snapshot.costPrice) : undefined),
                condition: item.condition || snapshot.condition || 'novo',
                handlingType: item.handling_type || snapshot.handlingType || '',
                observation: item.observation !== undefined ? item.observation : snapshot.observation,
                isTemporaryProduct: item.is_temporary_product != null ? Boolean(item.is_temporary_product) : Boolean(snapshot.isTemporaryProduct)
            };
        });
    } else if (Array.isArray(row.items) && row.items.length > 0) {
        items = row.items;
    } else if (Array.isArray(rawLegacy.items) && rawLegacy.items.length > 0) {
        items = rawLegacy.items;
    }

    // Itens Summary
    const itemsSummary = rawLegacy.itemsSummary || {
        itemsSubtotal: row.items_subtotal != null ? Number(row.items_subtotal) : totalAmount,
        totalQuantity: items.reduce((acc: number, item: any) => acc + (Number(item?.quantity) || 0), 0),
        totalItemsCost: row.total_cost != null ? Number(row.total_cost) : 0,
        itemsTotalValue: totalAmount,
        totalFixedDiscount: row.total_discount != null ? Number(row.total_discount) : 0
    };

    // Cliente e Snapshots
    const rawCustomer = rawLegacy.customerData || {};
    const customerData = {
        ...rawCustomer,
        id: row.customer_id || rawCustomer.id || rawLegacy.customerId || '',
        fullName: row.customer_name || rawCustomer.fullName || '',
        phone: row.customer_phone || rawCustomer.phone || '',
        email: row.customer_email || rawCustomer.email || '',
        noPhone: rawCustomer.noPhone ?? false,
        noAddress: rawCustomer.noAddress ?? false,
        fullAddress: rawCustomer.fullAddress || {
            cep: '',
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: 'PR'
        }
    };

    // Frete e Agendamento
    const shipping = rawLegacy.shipping || {
        deliveryMethod: row.delivery_method || 'delivery',
        value: 0,
        orderType: 'Standard',
        scheduling: {
            date: row.scheduled_date || '',
            startTime: row.scheduled_start_time || '',
            endTime: row.scheduled_end_time || '',
            type: 'range'
        }
    };

    if (row.scheduled_date && (!shipping.scheduling || !shipping.scheduling.date)) {
        if (!shipping.scheduling) shipping.scheduling = {};
        shipping.scheduling.date = row.scheduled_date;
    }
    if (row.delivery_method) {
        shipping.deliveryMethod = row.delivery_method;
    }

    // Flags operacionais
    const deleted = row.deleted != null ? Boolean(row.deleted) : Boolean(rawLegacy.deleted);
    const deletedAt = row.deleted_at || rawLegacy.deletedAt || null;
    const stockProcessed = row.stock_processed != null ? Boolean(row.stock_processed) : Boolean(rawLegacy.stockProcessed);
    const isStockChecked = row.is_stock_checked != null ? Boolean(row.is_stock_checked) : Boolean(rawLegacy.isStockChecked);
    const isRegisteredInBling = row.is_registered_in_bling != null ? Boolean(row.is_registered_in_bling) : Boolean(rawLegacy.isRegisteredInBling);
    const marketingOrigin = row.marketing_origin || rawLegacy.marketingOrigin || customerData.marketingOrigin || 'organic';

    // Pagamentos: Prioriza tabela normalizada order_payments se preenchida, com fallback estrito para rawLegacy.payments
    let payments: any[] = [];
    if (Array.isArray(row.order_payments) && row.order_payments.length > 0) {
        payments = row.order_payments.map((p: any) => ({
            method: p.payment_method || p.method || '',
            amount: Number(p.amount || 0),
            fee: Number(p.fee || 0),
            feeType: p.fee_type || p.feeType || 'fixed',
            status: p.status || 'PAGO',
            installments: p.installments != null ? Number(p.installments) : 1
        }));
    } else if (Array.isArray(rawLegacy.payments) && rawLegacy.payments.length > 0) {
        payments = rawLegacy.payments;
    }

    // Montagem final preservando snapshots complementares
    const orderDomain: Order = {
        ...rawLegacy,
        id,
        status,
        orderType,
        orderIndex,
        orderNumber,
        date: rawLegacy.date || row.created_at || new Date().toISOString(),
        customerData,
        seller,
        sellerId,
        items,
        itemsSummary,
        payments,
        paymentsSummary,
        shipping,
        observation: rawLegacy.observation || row.notes || '',
        deleted,
        deletedAt,
        stockProcessed,
        isStockChecked,
        isRegisteredInBling,
        marketingOrigin,
        returnOrderId: row.return_order_id || rawLegacy.returnOrderId || undefined,
        linkedOrderId: row.linked_order_id || rawLegacy.linkedOrderId || undefined
    };

    return capitalizeOrder(orderDomain);
}
