import { getOrderAssemblyFlags } from '../../orders/domain/orderAssemblyRules';

export type DeliveryServiceType = 'delivery' | 'pickup' | 'assistance' | 'return';

export interface DeliveryServiceClassification {
  serviceType: DeliveryServiceType;
  serviceLabel: string;
  isReturn: boolean;
  isAssistance: boolean;
  isPickup: boolean;
  isDelivery: boolean;
  hasInternalAssembly: boolean;
  hasOutsideAssembly: boolean;
  badgeBackgroundColor: string;
  badgeTextColor: string;
}

const SERVICE_CONFIG: Record<
  DeliveryServiceType,
  { label: string; backgroundColor: string; textColor: string }
> = {
  return: {
    label: 'COLETA DE DEVOLUÇÃO',
    backgroundColor: '#f97316',
    textColor: '#ffffff',
  },
  assistance: {
    label: 'ASSISTÊNCIA',
    backgroundColor: '#ea580c',
    textColor: '#ffffff',
  },
  pickup: {
    label: 'RETIRADA',
    backgroundColor: '#9333ea',
    textColor: '#ffffff',
  },
  delivery: {
    label: 'ENTREGA',
    backgroundColor: '#16a34a',
    textColor: '#ffffff',
  },
};

/**
 * Classifica a natureza operacional de uma entrega e suas necessidades de montagem.
 * Segue o Princípio da Responsabilidade Única (SRP) e serve como Single Source of Truth (SSOT).
 */
export function classifyDeliveryService(order: any): DeliveryServiceClassification {
  if (!order) {
    const defaultDeliv = SERVICE_CONFIG.delivery;
    return {
      serviceType: 'delivery',
      serviceLabel: defaultDeliv.label,
      isReturn: false,
      isAssistance: false,
      isPickup: false,
      isDelivery: true,
      hasInternalAssembly: false,
      hasOutsideAssembly: false,
      badgeBackgroundColor: defaultDeliv.backgroundColor,
      badgeTextColor: defaultDeliv.textColor,
    };
  }

  const rawOrderData = order.order_data || order;
  const rawOrderType = String(
    order.orderType ||
      order.order_type ||
      rawOrderData.orderType ||
      order.taskType ||
      rawOrderData.taskType ||
      ''
  ).toLowerCase();

  const isReturn =
    rawOrderType === 'return' ||
    rawOrderType === 'devolucao' ||
    rawOrderType === 'devolução';

  const isAssistance =
    !isReturn && (rawOrderType === 'assistance' || rawOrderData.taskType === 'assistance');

  const deliveryMethod = String(
    order.shipping?.deliveryMethod ||
      rawOrderData.shipping?.deliveryMethod ||
      order.deliveryMethod ||
      ''
  ).toLowerCase();

  const isPickup = !isReturn && !isAssistance && deliveryMethod === 'pickup';
  const isDelivery = !isReturn && !isAssistance && !isPickup;

  let serviceType: DeliveryServiceType = 'delivery';
  if (isReturn) serviceType = 'return';
  else if (isAssistance) serviceType = 'assistance';
  else if (isPickup) serviceType = 'pickup';

  const flags = getOrderAssemblyFlags(order);

  // Fallback complementar analisando descrições dos itens se as flags não acusarem montagem
  let hasInternal = flags.hasAssemblyDepot;
  let hasOutside = flags.hasAssemblyOutside;

  if (!hasInternal || !hasOutside) {
    const allItems = [
      ...(order.items || rawOrderData.items || []),
      ...(order.assistanceItems || rawOrderData.assistanceItems || []),
    ];
    for (const item of allItems) {
      const handling = String(item?.handlingType || item?.handling || '').toLowerCase();
      if (!hasOutside && (handling.includes('fora') || handling.includes('externa') || handling.includes('cliente'))) {
        hasOutside = true;
      }
      if (
        !hasInternal &&
        (handling.includes('loja') ||
          handling.includes('deposito') ||
          handling.includes('depósito') ||
          handling.includes('interna') ||
          handling.includes('montado')) &&
        !handling.includes('fora')
      ) {
        hasInternal = true;
      }
    }
  }

  const config = SERVICE_CONFIG[serviceType];

  return {
    serviceType,
    serviceLabel: config.label,
    isReturn,
    isAssistance,
    isPickup,
    isDelivery,
    hasInternalAssembly: isReturn ? false : hasInternal,
    hasOutsideAssembly: isReturn ? false : hasOutside,
    badgeBackgroundColor: config.backgroundColor,
    badgeTextColor: config.textColor,
  };
}
