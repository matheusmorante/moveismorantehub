import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import { resolveFiscalCfopOrderScope } from '../../../../../../../../shared-utils/fiscalCfopModel';
import { resolveOrderFiscalModel } from '../../../../../../../../shared-utils/fiscalDocumentModel';
import type { DeliveryMethod } from '../../../../../../../../shared-utils/fiscalTransportModel';

export function initialAcquisitionPurpose(
  order: Order | null,
  requiresExplicitPurpose: boolean
): FiscalAcquisitionPurpose | null {
  const persistedPurpose = order?.fiscalContext?.acquisitionPurpose;
  if (persistedPurpose) return persistedPurpose;
  if (requiresExplicitPurpose) return null;
  return order?.fiscalContext?.finalConsumer === false ? 'resale' : 'use_consumption';
}

export function resolveOrderFiscalModelContext({
  order,
  issuerUf,
  savedAcquisitionPurpose,
}: {
  order: Order | null;
  issuerUf: string;
  savedAcquisitionPurpose: FiscalAcquisitionPurpose | null;
}) {
  const operationScope = order
    ? resolveFiscalCfopOrderScope({
        issuerUf,
        deliveryMethod: order.shipping?.deliveryMethod,
        shipping: order.shipping,
        customerAddress: order.customerData?.fullAddress,
      })
    : null;
  const requiresExplicitAcquisitionPurpose = operationScope?.scope === 'interstate';

  const acquisitionPurpose =
    savedAcquisitionPurpose ?? initialAcquisitionPurpose(order, requiresExplicitAcquisitionPurpose);
  const finalConsumer = acquisitionPurpose === null ? undefined : acquisitionPurpose !== 'resale';

  const deliveryMethod: DeliveryMethod =
    order?.shipping?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery';

  const modelOrder = order
    ? {
        ...order,
        fiscalContext: {
          ...order.fiscalContext,
          ...(savedAcquisitionPurpose ? { acquisitionPurpose: savedAcquisitionPurpose } : {}),
          finalConsumer: acquisitionPurpose === null ? undefined : acquisitionPurpose !== 'resale',
        },
      }
    : null;

  const modelDecision = modelOrder
    ? resolveOrderFiscalModel(modelOrder, { issuerUf, finalConsumer })
    : null;
  const currentModel: '55' | '65' = modelDecision?.status === 'ready' ? modelDecision.model : '55';

  return {
    requiresExplicitAcquisitionPurpose,
    acquisitionPurpose,
    finalConsumer,
    deliveryMethod,
    modelOrder,
    modelDecision,
    currentModel,
  };
}
