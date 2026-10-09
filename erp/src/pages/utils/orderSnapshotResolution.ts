import Order from '../types/order.type';
import CustomerData from '../types/customerData.type';
import Person from '../types/person.type';
import { withOrderAddressSnapshot } from './orderAddressSnapshot';
import { fetchPersonById } from './personService';

const isCustomerSnapshotIncomplete = (customerData?: CustomerData): boolean => {
  if (!customerData) return true;
  const hasName = Boolean(customerData.fullName && customerData.fullName.trim().length > 0);
  const hasPhone = Boolean(
    customerData.noPhone || (customerData.phone && customerData.phone.trim().length > 0)
  );
  return !hasName || !hasPhone;
};

const mapPersonToCustomerSnapshot = (person: Person, currentData?: CustomerData): CustomerData => {
  const addr: any = person.fullAddress || {};
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
      housingType: addr.housingType || (currentData?.fullAddress as any)?.housingType || '',
      mapsUrl: addr.mapsUrl || (currentData?.fullAddress as any)?.mapsUrl || '',
    },
    additionalContacts: person.additionalContacts || currentData?.additionalContacts || [],
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
    customerData: customerData ? { ...customerData } : (order.customerData as CustomerData),
  };

  return withOrderAddressSnapshot(orderWithSnapshot as Order);
};

export { buildOrderPersistencePayload } from './orderPersistencePayload';
