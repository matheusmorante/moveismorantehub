import Order from "../types/order.type";
import CustomerData from "../types/customerData.type";
import Person from "../types/person.type";
import { withOrderAddressSnapshot } from "./orderAddressSnapshot";
import { fetchPersonById } from "./personService";

const isCustomerSnapshotIncomplete = (customerData?: CustomerData): boolean => {
    if (!customerData) return true;
    const hasName = Boolean(customerData.fullName && customerData.fullName.trim().length > 0);
    const hasPhone = Boolean(customerData.noPhone || (customerData.phone && customerData.phone.trim().length > 0));
    return !hasName || !hasPhone;
};

const mapPersonToCustomerSnapshot = (person: Person, currentData?: CustomerData): CustomerData => {
    const addr = person.fullAddress || {};
    return {
        ...currentData,
        id: person.id,
        fullName: person.fullName || person.tradeName || currentData?.fullName || '',
        phone: person.phone || currentData?.phone || '',
        noPhone: person.noPhone ?? currentData?.noPhone ?? false,
        noAddress: person.noAddress ?? currentData?.noAddress ?? false,
        fullAddress: {
            cep: addr.cep || currentData?.fullAddress?.cep || '',
            street: addr.street || currentData?.fullAddress?.street || '',
            number: addr.number || currentData?.fullAddress?.number || '',
            complement: addr.complement || currentData?.fullAddress?.complement || '',
            neighborhood: addr.neighborhood || currentData?.fullAddress?.neighborhood || '',
            city: addr.city || currentData?.fullAddress?.city || '',
            state: addr.state || currentData?.fullAddress?.state || 'PR',
            observation: addr.observation || currentData?.fullAddress?.observation || '',
            housingType: (addr as any).housingType || (currentData?.fullAddress as any)?.housingType || '',
            mapsUrl: (addr as any).mapsUrl || (currentData?.fullAddress as any)?.mapsUrl || ''
        },
        additionalContacts: person.additionalContacts || currentData?.additionalContacts || [],
        marketingOrigin: person.marketingOrigin || currentData?.marketingOrigin || 'organic'
    };
};

/**
 * Garante que o snapshot do cliente e do endereço estejam íntegros no pedido.
 * Se o cliente possui ID vinculado mas o snapshot textual estiver incompleto
 * (por exemplo, após seleção parcial ou rascunho sem nome), busca os dados
 * da pessoa no banco e congela o snapshot no pedido.
 */
export const resolveOrderCustomerSnapshot = async (
    order: Order,
    fetchPersonFn: (id: string) => Promise<Person | null> = fetchPersonById
): Promise<Order> => {
    let customerData = order.customerData;

    if (customerData?.id && isCustomerSnapshotIncomplete(customerData)) {
        try {
            const person = await fetchPersonFn(customerData.id);
            if (person) {
                customerData = mapPersonToCustomerSnapshot(person, customerData);
            }
        } catch (err) {
            console.error('[OrderSnapshot] Erro ao carregar dados da pessoa para snapshot:', err);
        }
    }

    const orderWithSnapshot = {
        ...order,
        customerData: customerData ? { ...customerData } : undefined
    };

    return withOrderAddressSnapshot(orderWithSnapshot);
};

/**
 * Monta o payload padronizado para as colunas físicas da tabela 'orders' do Supabase,
 * garantindo sincronia entre o JSON 'order_data' e as colunas dedicadas de consulta.
 */
export const buildOrderPersistencePayload = (order: Order) => {
    const customerId = order.customerData?.id || null;
    const customerName = order.customerData?.fullName || (order as any).customerName || '';
    const sellerId = (order as any).sellerId || null;
    const sellerName = (order as any).seller || '';
    const orderIndex = Number(order.orderIndex || order.orderNumber || 0) || null;
    const orderNumber = String(order.orderIndex || order.orderNumber || '');
    const status = order.status || 'draft';
    const totalAmount = order.paymentsSummary?.totalOrderValue ?? (order.total_amount ?? 0);
    const orderType = order.orderType || 'sale';
    const scheduledDate = order.shipping?.scheduling?.date || (order as any).scheduledDate || null;
    const scheduledStartTime = order.shipping?.scheduling?.startTime || null;
    const scheduledEndTime = order.shipping?.scheduling?.endTime || null;
    const deliveryMethod = order.shipping?.deliveryMethod || null;
    const deliveryStatus = (order as any).deliveryStatus || null;
    const marketingOrigin = order.marketingOrigin || order.customerData?.marketingOrigin || null;
    const itemsSubtotal = order.itemsSummary?.itemsSubtotal ?? 0;
    const totalDiscount = order.itemsSummary?.totalFixedDiscount ?? 0;
    const totalCost = order.itemsSummary?.totalItemsCost ?? 0;
    const stockProcessed = Boolean(order.stockProcessed);
    const isStockChecked = Boolean(order.isStockChecked);
    const isRegisteredInBling = Boolean(order.isRegisteredInBling);
    const deleted = Boolean(order.deleted);
    const deletedAt = order.deletedAt ? new Date(order.deletedAt).toISOString() : null;
    const returnOrderId = (order as any).returnOrderId || null;
    const linkedOrderId = (order as any).linkedOrderId || null;

    return {
        order_data: order,
        items: order.items || [],
        order_number: orderNumber,
        order_index: orderIndex,
        order_type: orderType,
        status: status,
        customer_id: customerId,
        customer_name: customerName,
        seller_id: sellerId,
        seller_name: sellerName,
        total_amount: totalAmount,
        scheduled_date: scheduledDate ? String(scheduledDate).slice(0, 10) : null,
        scheduled_start_time: scheduledStartTime,
        scheduled_end_time: scheduledEndTime,
        delivery_method: deliveryMethod,
        delivery_status: deliveryStatus,
        marketing_origin: marketingOrigin,
        items_subtotal: itemsSubtotal,
        total_discount: totalDiscount,
        total_cost: totalCost,
        stock_processed: stockProcessed,
        is_stock_checked: isStockChecked,
        is_registered_in_bling: isRegisteredInBling,
        deleted: deleted,
        deleted_at: deletedAt,
        return_order_id: returnOrderId,
        linked_order_id: linkedOrderId,
        updated_at: new Date().toISOString()
    };
};
