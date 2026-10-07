import type Order from '@/pages/types/order.type';
import {
  resolveFiscalCfopOrderScope,
  validateItemCfopMatch,
} from '../../../../../../../../shared-utils/fiscalCfopModel';
import { resolveEffectiveRecipientIeIndicator } from '../../../../../../../../shared-utils/recipientIeIndicator';

export function resolveItemFiscalCfopContext(params: {
  order: Order | null | undefined;
  issuerUf?: string;
  configuredCfop?: string;
  recipientIeIndicator?: string;
}) {
  const { order, issuerUf, recipientIeIndicator } = params;
  const shipping = (order?.shipping as Record<string, unknown> | undefined) || {};
  const customerData = (order?.customerData as Record<string, unknown> | undefined) || {};
  const orderFiscalContext =
    (order?.fiscalContext as Record<string, unknown> | undefined) || {};
  const effectiveRecipientIeIndicator = resolveEffectiveRecipientIeIndicator({
    selected: recipientIeIndicator,
    persisted: orderFiscalContext.recipientIeIndicator,
    customer: customerData.ieIndicator,
    ie: customerData.ie,
  });
  const operationScope = resolveFiscalCfopOrderScope({
    issuerUf,
    deliveryMethod: order?.shipping?.deliveryMethod,
    shipping,
    customerAddress: customerData.fullAddress || customerData.address,
  });

  const defaultCfop = operationScope.destination === '1' ? '5102' : '';
  const defaultCst = operationScope.destination === '1' ? '103' : '';
  const suggestedInitialCfop =
    operationScope.destination === '1'
      ? defaultCfop
      : operationScope.destination === '2'
        ? effectiveRecipientIeIndicator === '9'
          ? '6108'
          : '6102'
        : '';
  const compatibleCfop = (candidate: unknown): string => {
    if (typeof candidate !== 'string' || !candidate || !operationScope.destination) return '';
    const isScopeCompatible = validateItemCfopMatch({
      cfop: candidate,
      destination: operationScope.destination,
      model: '55',
      direction: 'outbound',
      itemType: 'product',
      operationType: 'sale',
    }).valid;
    return isScopeCompatible && candidate === suggestedInitialCfop
      ? candidate
      : '';
  };

  return { operationScope, defaultCfop, defaultCst, suggestedInitialCfop, compatibleCfop };
}
