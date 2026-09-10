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
    const orderNumber = String(order.orderIndex || order.orderNumber || '');
    const status = order.status || 'draft';
    const totalAmount = order.paymentsSummary?.totalOrderValue ?? (order.total_amount ?? 0);

    return {
        order_data: order,
        order_number: orderNumber,
        status: status,
        customer_id: customerId,
        customer_name: customerName,
        seller_id: sellerId,
        seller_name: sellerName,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
    };
};
