import React from 'react';
import type Order from '@/pages/types/order.type';
import { fetchPersonById } from '@/pages/utils/personService';
import { withNfeEmissionStage } from '../../../../../../../../src/telemetry/nfeEmissionPerformance';
import { recipientTaxIdKind } from '../../../../../../../../shared-utils/recipientTaxId';

type RegisteredCustomerFiscalData = {
  id: string;
  personType?: 'PF' | 'PJ';
  cpfCnpj: string;
};

export function useNfeCustomerPersonType(order: Order | null) {
  const orderId = order?.id;
  const customerId = order?.customerData?.id;
  const snapshotTaxId = order?.customerData?.cpfCnpj || order?.customerData?.document || '';
  const taxIdKind = snapshotTaxId ? recipientTaxIdKind(snapshotTaxId) : undefined;
  const snapshotPersonType =
    order?.customerData?.personType === 'PF' || order?.customerData?.personType === 'PJ'
      ? order.customerData.personType
      : taxIdKind === 'CPF'
        ? 'PF'
        : taxIdKind === 'CNPJ'
          ? 'PJ'
          : undefined;
  const hasSnapshotFiscalIdentity = Boolean(snapshotPersonType && snapshotTaxId);
  const [registeredCustomer, setRegisteredCustomer] = React.useState<RegisteredCustomerFiscalData | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!orderId || !customerId || hasSnapshotFiscalIdentity) {
      setRegisteredCustomer(null);
      return () => {
        active = false;
      };
    }

    const loadCustomerFiscalData = async () => {
      try {
        const person = await withNfeEmissionStage(
          'customer_resolution',
          () => fetchPersonById(customerId),
          { source: 'customer_lookup' }
        );
        if (active) {
          setRegisteredCustomer({
            id: customerId,
            personType: person?.personType,
            cpfCnpj: person?.cpfCnpj || '',
          });
        }
      } catch {
        if (active) setRegisteredCustomer({ id: customerId, cpfCnpj: '' });
      }
    };

    void loadCustomerFiscalData();
    return () => {
      active = false;
    };
  }, [orderId, customerId, hasSnapshotFiscalIdentity]);

  const registeredCustomerLoaded = Boolean(customerId && registeredCustomer?.id === customerId);
  const customerPersonType = snapshotPersonType || (registeredCustomerLoaded ? registeredCustomer?.personType : undefined);
  const registeredTaxId =
    snapshotTaxId || (registeredCustomerLoaded ? registeredCustomer?.cpfCnpj || '' : '');
  const isLoadingCustomerType = Boolean(
    customerId && !hasSnapshotFiscalIdentity && !registeredCustomerLoaded
  );

  const emissionOrder = React.useMemo(() => {
    if (!order) return null;
    if (!customerId) return order;
    if (!registeredCustomerLoaded) return order;
    return {
      ...order,
      customerData: {
        ...order.customerData,
        personType: customerPersonType,
        cpfCnpj: registeredTaxId,
        document: registeredTaxId,
      },
    };
  }, [order, customerId, registeredCustomerLoaded, customerPersonType, registeredTaxId]);

  return {
    customerPersonType,
    isLoadingCustomerType,
    emissionOrder,
  };
}
