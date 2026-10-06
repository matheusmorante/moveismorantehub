import React from 'react';
import type Order from '@/pages/types/order.type';
import { fetchPersonById } from '@/pages/utils/personService';
import { recipientTaxIdKind } from '../../../../../../../../shared-utils/recipientTaxId';

export function useNfeCustomerPersonType(order: Order | null) {
  const initialPersonType = React.useMemo<'PF' | 'PJ' | undefined>(() => {
    if (order?.customerData?.personType) return order.customerData.personType;
    const doc = order?.customerData?.cpfCnpj || order?.customerData?.document || '';
    if (doc) {
      const kind = recipientTaxIdKind(doc);
      if (kind === 'CNPJ') return 'PJ';
      if (kind === 'CPF') return 'PF';
    }
    return undefined;
  }, [order?.customerData?.personType, order?.customerData?.cpfCnpj, order?.customerData?.document]);

  const [customerPersonType, setCustomerPersonType] = React.useState<'PF' | 'PJ' | undefined>(
    initialPersonType
  );
  const [isLoadingCustomerType, setIsLoadingCustomerType] = React.useState(
    Boolean(order?.customerData?.id && !initialPersonType)
  );

  React.useEffect(() => {
    setCustomerPersonType(initialPersonType);
    setIsLoadingCustomerType(Boolean(order?.customerData?.id && !initialPersonType));
  }, [initialPersonType, order?.customerData?.id]);

  React.useEffect(() => {
    let active = true;
    const loadPersonType = async () => {
      if (initialPersonType || !order?.customerData?.id) {
        setIsLoadingCustomerType(false);
        return;
      }
      setIsLoadingCustomerType(true);
      const person = await fetchPersonById(order.customerData.id);
      if (active) {
        if (person?.personType) setCustomerPersonType(person.personType);
        setIsLoadingCustomerType(false);
      }
    };
    void loadPersonType();
    return () => {
      active = false;
    };
  }, [order?.id, order?.customerData?.id, initialPersonType]);

  const emissionOrder = React.useMemo(() => {
    if (!order) return null;
    const resolvedType = customerPersonType || initialPersonType;
    if (resolvedType && order.customerData?.personType !== resolvedType) {
      return { ...order, customerData: { ...order.customerData, personType: resolvedType } };
    }
    return order;
  }, [order, customerPersonType, initialPersonType]);

  return {
    customerPersonType,
    isLoadingCustomerType,
    emissionOrder,
  };
}
