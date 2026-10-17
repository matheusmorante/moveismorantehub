import { OrderDatabaseRow } from './orderMapperTypes';

export function mapCustomerData(row: OrderDatabaseRow, rawLegacy: any) {
  const rawCustomer = rawLegacy.customerData || {};
  const rawDoc = String(rawCustomer.cpfCnpj || rawCustomer.document || '').replace(/\D/g, '');
  const inferredPersonType =
    rawCustomer.personType ||
    (rawDoc.length === 14 ? 'PJ' : rawDoc.length === 11 ? 'PF' : undefined);

  return {
    ...rawCustomer,
    personType: inferredPersonType,
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
      state: 'PR',
    },
  };
}
