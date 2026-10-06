import { useEffect, useState } from 'react';
import type Order from '@/pages/types/order.type';
import {
  type DeliveryMethod,
  type FreightContractResponsible,
  resolveDefaultTransport,
  resolveTransport,
  type TransportResponsible,
} from '../../../../../../../../shared-utils/fiscalTransportModel';
import type { ThirdPartyTransporterForm } from '../NfeTransportSection';

export interface UseNfeTransportProps {
  order: Order | null;
  currentModel: '55' | '65';
  deliveryMethod: DeliveryMethod;
}

export function useNfeTransport({
  order,
  currentModel,
  deliveryMethod,
}: UseNfeTransportProps) {
  const initialTransportDefaults = resolveDefaultTransport(currentModel, deliveryMethod);
  const [transportResponsible, setTransportResponsible] = useState<TransportResponsible | 'NONE'>(
    initialTransportDefaults.transportResponsible
  );
  const [freightContractResponsible, setFreightContractResponsible] =
    useState<FreightContractResponsible>('SENDER');

  const [thirdPartyTransporter, setThirdPartyTransporter] = useState<ThirdPartyTransporterForm>(
    () => {
      const t = order?.shipping?.transporter;
      const doc = t?.cnpj || t?.cpf || '';
      return {
        personType: doc.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ',
        cnpjCpf: doc,
        name: t?.name || '',
        ie: t?.ie || '',
        isIeExempt: !t?.ie,
        address: t?.address || '',
        city: t?.city || '',
        uf: t?.uf || 'PR',
      };
    }
  );

  useEffect(() => {
    const nextDefaults = resolveDefaultTransport(currentModel, deliveryMethod);
    setTransportResponsible(nextDefaults.transportResponsible);
  }, [order?.id, deliveryMethod, currentModel]);

  const resolvedTransport = resolveTransport({
    fiscalModel: currentModel,
    deliveryMethod,
    transportResponsible,
    freightContractResponsible,
  });

  const transportType =
    resolvedTransport.transportResponsible === 'OWN_COMPANY'
      ? 'OWN'
      : resolvedTransport.transportResponsible === 'THIRD_PARTY'
        ? 'THIRD_PARTY'
        : 'NONE';

  return {
    transportResponsible,
    setTransportResponsible,
    freightContractResponsible,
    setFreightContractResponsible,
    thirdPartyTransporter,
    setThirdPartyTransporter,
    resolvedTransport,
    transportType,
    freightMode: resolvedTransport.modFrete,
  };
}
