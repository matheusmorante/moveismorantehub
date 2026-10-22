import { migrateOrderHandlings } from '@/pages/utils/handlingMigration';
import { parseStorageDateToLocal } from '../hooks/useSalesOrderForm';

export function applyImportedOrderDataToForm(orderData: any, formActions: any): void {
  const migrated = migrateOrderHandlings(orderData);
  if (migrated.seller) {
    formActions.setSeller(migrated.seller);
  }
  if (migrated.customerData) {
    formActions.setCustomerData(migrated.customerData);
  }
  if (migrated.observation) {
    formActions.setObservation(migrated.observation);
  }
  if (migrated.date) {
    formActions.setOrderDate(parseStorageDateToLocal(migrated.date));
  }
  if (migrated.shipping) {
    if (
      migrated.shipping.deliveryMethod === 'delivery' ||
      migrated.shipping.deliveryMethod === 'pickup'
    ) {
      formActions.setDeliveryMethod(migrated.shipping.deliveryMethod);
    }
    formActions.setShipping((prev: any) => ({
      ...prev,
      ...migrated.shipping,
      deliveryMethod: migrated.shipping.deliveryMethod || prev.deliveryMethod,
      orderType: migrated.shipping.orderType || prev.orderType,
      value: typeof migrated.shipping.value === 'number' ? migrated.shipping.value : prev.value,
      scheduling: migrated.shipping.scheduling
        ? {
            ...migrated.shipping.scheduling,
            notInformed: !!migrated.shipping.scheduling.notInformed,
            dateType: migrated.shipping.scheduling.dateType || 'fixed',
            date: migrated.shipping.scheduling.date || '',
            endDate: migrated.shipping.scheduling.endDate || '',
            type: migrated.shipping.scheduling.type || 'fixed',
            time: migrated.shipping.scheduling.time || '',
            startTime: migrated.shipping.scheduling.startTime || '',
            endTime: migrated.shipping.scheduling.endTime || '',
          }
        : prev.scheduling,
    }));
  }
  if (migrated.items && Array.isArray(migrated.items)) {
    const mappedItems = migrated.items.map((item: any) => ({
      ...item,
      orderItemId: item.orderItemId || crypto.randomUUID(),
      linkedProductOrderItemIds: Array.isArray(item.linkedProductOrderItemIds)
        ? [...item.linkedProductOrderItemIds]
        : undefined,
      linkedProductOrderItemId: item.linkedProductOrderItemId || undefined,
      productId: item.productId || undefined,
      variationId: item.variationId || undefined,
      code: item.code || '',
      description: item.description || '',
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      costPrice: typeof item.costPrice === 'number' ? item.costPrice : 0,
      condition: item.condition || 'novo',
      handlingType: item.handlingType || '',
      observation: item.observation || '',
    }));
    formActions.setItems(mappedItems);
  }
  if (migrated.payments && Array.isArray(migrated.payments)) {
    const mappedPayments = migrated.payments.map((pay: any) => ({
      ...pay,
      method: pay.method || '',
      amount: typeof pay.amount === 'number' ? pay.amount : 0,
      status: pay.status || '',
    }));
    formActions.setPayments(mappedPayments);
  }
}

export function buildImportedClientDraft(clientData: any): Record<string, any> {
  return {
    personType: clientData.personType || 'PF',
    fullName: clientData.fullName || '',
    cpfCnpj: clientData.cpfCnpj || '',
    phone: clientData.phone || '',
    email: clientData.email || '',
    noPhone: clientData.noPhone !== undefined ? !!clientData.noPhone : false,
    marketingOrigin: clientData.marketingOrigin || 'organic',
    fullAddress: {
      cep: clientData.fullAddress?.cep || '',
      street: clientData.fullAddress?.street || '',
      number: clientData.fullAddress?.number || '',
      neighborhood: clientData.fullAddress?.neighborhood || '',
      city: clientData.fullAddress?.city || '',
      state: clientData.fullAddress?.state || '',
      complement: clientData.fullAddress?.complement || '',
      observation: clientData.fullAddress?.observation || '',
    },
    noAddress: clientData.noAddress !== undefined ? !!clientData.noAddress : false,
  };
}
