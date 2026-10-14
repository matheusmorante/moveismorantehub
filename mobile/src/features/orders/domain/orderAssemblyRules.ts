/**
 * Regras de domínio para classificação de montagens (depósito vs fora)
 * e detecção de tráfego pago na listagem de pedidos móveis.
 * Segue o Princípio da Responsabilidade Única (SRP).
 */

const normalize = (str: string): string =>
  (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getMatchingOption = (hLabel: string, handlingOptions: any[]) => {
  if (!hLabel) return null;
  const options = Array.isArray(handlingOptions) ? handlingOptions : [];
  return options.find((o) => {
    const sLabel = normalize(o?.label);
    return sLabel === hLabel || (sLabel && (hLabel.includes(sLabel) || sLabel.includes(hLabel)));
  });
};

export const isHandlingDepot = (item: any, handlingOptions: any[] = []): boolean => {
  const hLabel = normalize(typeof item === 'string' ? item : item?.handlingType || item?.handling);
  if (
    !hLabel ||
    hLabel.includes('sem montagem') ||
    hLabel.includes('sem_montagem') ||
    hLabel.includes('apenas entrega') ||
    hLabel.includes('nao necessita')
  ) {
    return false;
  }
  const opt = getMatchingOption(hLabel, handlingOptions);
  if (opt?.includeInAssemblySchedule) return true;
  return (
    hLabel.includes('montagem no deposito') ||
    hLabel.includes('montagem para retirada') ||
    hLabel.includes('montagem no depósito') ||
    hLabel.includes('deposito') ||
    hLabel.includes('loja')
  );
};

export const isHandlingOutside = (item: any, handlingOptions: any[] = []): boolean => {
  const hLabel = normalize(typeof item === 'string' ? item : item?.handlingType || item?.handling);
  if (
    !hLabel ||
    hLabel.includes('sem montagem') ||
    hLabel.includes('sem_montagem') ||
    hLabel.includes('apenas entrega') ||
    hLabel.includes('nao necessita')
  ) {
    return false;
  }
  const opt = getMatchingOption(hLabel, handlingOptions);
  if (opt?.isAssemblyOutside) return true;
  return (
    hLabel.includes('montagem na entrega') ||
    hLabel.includes('montagem fora') ||
    hLabel.includes('montagem no endereco') ||
    hLabel.includes('montagem no local') ||
    hLabel.includes('montador')
  );
};

export const getOrderAssemblyFlags = (
  order: any,
  handlingOptions: any[] = []
): { hasAssemblyDepot: boolean; hasAssemblyOutside: boolean } => {
  const data = order?.order_data || {};
  const shipping = data?.shipping || {};
  const orderType = String(order?.orderType || order?.order_type || data?.orderType || 'sale').toLowerCase();
  const isReturn = orderType === 'return';

  if (isReturn) {
    return { hasAssemblyDepot: false, hasAssemblyOutside: false };
  }

  const allOrderItems = [
    ...(data.items || order?.items || []),
    ...(data.assistanceItems || order?.assistanceItems || []),
  ];

  const orderHandling = normalize(
    data.handlingType ||
      data.handling ||
      data.deliveryType ||
      shipping.handlingType ||
      shipping.handling ||
      order?.handling ||
      ''
  );

  const hasAssemblyOutside =
    isHandlingOutside(orderHandling, handlingOptions) ||
    allOrderItems.some((item) => isHandlingOutside(item, handlingOptions));

  const hasAssemblyDepot =
    isHandlingDepot(orderHandling, handlingOptions) ||
    allOrderItems.some((item) => isHandlingDepot(item, handlingOptions));

  return { hasAssemblyDepot, hasAssemblyOutside };
};

export const isPaidTrafficOrder = (order: any): boolean => {
  const data = order?.order_data || {};
  const mOrigin1 = (order?.marketingOrigin || data?.marketingOrigin || '').toLowerCase();
  const mOrigin2 = (data?.customerData?.marketingOrigin || '').toLowerCase();

  const isOriginPaid = (origin: string) =>
    origin === 'paid' ||
    origin.includes('pago') ||
    origin.includes('ads') ||
    origin.includes('facebook') ||
    origin.includes('insta') ||
    origin.includes('trafego') ||
    origin.includes('tráfego') ||
    origin.includes('google');

  return isOriginPaid(mOrigin1) || isOriginPaid(mOrigin2);
};
