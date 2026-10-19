import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';

import { getSettings } from '@/pages/utils/settingsService';

import { resolveFiscalCfopOrderScope } from '../../../../../../../shared-utils/fiscalCfopModel';
import { resolveOrderFiscalModel } from '../../../../../../../shared-utils/fiscalDocumentModel';
import type { DeliveryMethod } from '../../../../../../../shared-utils/fiscalTransportModel';
import { useNfeEmissionActions } from './hooks/useNfeEmissionActions';
import { useNfeItemEnrichment } from './hooks/useNfeItemEnrichment';
import { useNfeRecipientTaxId } from './hooks/useNfeRecipientTaxId';
import { useNfeSequencePreview } from './hooks/useNfeSequencePreview';
import { useNfeTransport } from './hooks/useNfeTransport';
import { useNfePreparationForms } from './hooks/useNfePreparationForms';
import {
  clearFiscalEmissionDrafts,
  type FiscalFieldError,
  fiscalDrafts,
} from './types/nfeEmission.types';

export type { FiscalFieldError };
export { clearFiscalEmissionDrafts };

function initialAcquisitionPurpose(
  order: Order | null,
  requiresExplicitPurpose: boolean
): FiscalAcquisitionPurpose | null {
  const persistedPurpose = order?.fiscalContext?.acquisitionPurpose;
  if (persistedPurpose) return persistedPurpose;
  if (requiresExplicitPurpose) return null;
  return order?.fiscalContext?.finalConsumer === false ? 'resale' : 'use_consumption';
}

export function useNfeEmission(
  order: Order | null,
  onSuccess?: (result: NfeEmissionResult) => void
) {
  const { profile } = useAuth();
  const canOperateFiscal = hasFiscalOperationRole(profile);
  const [environment, setEnvironment] = useState<1 | 2>(DEFAULT_NFE_ENVIRONMENT);
  const fiscalOperationLock = useRef(false);
  const issuerUf = getSettings().companyUF;
  const operationScope = order
    ? resolveFiscalCfopOrderScope({
        issuerUf,
        deliveryMethod: order.shipping?.deliveryMethod,
        shipping: order.shipping,
        customerAddress: order.customerData?.fullAddress,
      })
    : null;
  const requiresExplicitAcquisitionPurpose = operationScope?.scope === 'interstate';

  const [savedAcquisitionPurpose, setSavedAcquisitionPurpose] =
    useState<FiscalAcquisitionPurpose | null>(
      () => order?.fiscalContext?.acquisitionPurpose ?? null
    );
  const acquisitionPurpose =
    savedAcquisitionPurpose ?? initialAcquisitionPurpose(order, requiresExplicitAcquisitionPurpose);
  const finalConsumer = acquisitionPurpose === null ? undefined : acquisitionPurpose !== 'resale';

  const deliveryMethod: DeliveryMethod =
    order?.shipping?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery';

  const manualFiscalFields = useRef(fiscalDrafts);

  const modelOrder = order
    ? {
        ...order,
        fiscalContext: {
          ...order.fiscalContext,
          ...(savedAcquisitionPurpose ? { acquisitionPurpose: savedAcquisitionPurpose } : {}),
          // Um indFinal legado não distingue uso/consumo de ativo imobilizado.
          finalConsumer: acquisitionPurpose === null ? undefined : acquisitionPurpose !== 'resale',
        },
      }
    : null;
  const modelDecision = modelOrder
    ? resolveOrderFiscalModel(modelOrder, { issuerUf, finalConsumer })
    : null;
  const currentModel: '55' | '65' = modelDecision?.status === 'ready' ? modelDecision.model : '55';
  const {
    recipientTaxId,
    setRecipientTaxId,
    recipientTaxIdError,
    setRecipientTaxIdError,
    recipientIe,
    setRecipientIe,
    recipientIeIndicator,
    setRecipientIeIndicator,
    recipientIeError,
  } = useNfeRecipientTaxId({ order, currentModel });

  // 1. Itens e Enriquecimento Fiscal
  const {
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
  } = useNfeItemEnrichment({
    order: modelOrder,
    environment,
    manualFiscalFields,
    finalConsumer,
    recipientIeIndicator,
    model: modelDecision?.status === 'ready' ? modelDecision.model : undefined,
  });
  const {
    handleAcquisitionPurposeChange, handleSaveDraft, isSavingAcquisitionPurpose,
    isSavingPreparation, preparationSaveError, preparationSaveBlocked, canUsePreparation,
  } = useNfePreparationForms({
    order, environment, operatorId: profile?.id, canOperateFiscal,
    acquisitionPurpose, recipientTaxId, nfeItems, isLoadingFiscalData,
    onPurposeSaved: setSavedAcquisitionPurpose,
    isFiscalOperationActive: () => fiscalOperationLock.current,
  });

  // 2. Transporte
  const {
    transportResponsible,
    setTransportResponsible,
    freightContractResponsible,
    setFreightContractResponsible,
    thirdPartyTransporter,
    setThirdPartyTransporter,
    resolvedTransport,
    transportType,
    freightMode,
  } = useNfeTransport({ order, currentModel, deliveryMethod });

  useEffect(() => {
    setSavedAcquisitionPurpose(order?.fiscalContext?.acquisitionPurpose ?? null);
  }, [order?.id, order?.fiscalContext?.acquisitionPurpose]);

  // 3. Sequência Numérica
  const {
    numberPreview,
    manualNumberInput,
    nfeNumberSequence,
    isLoadingNfeNumber,
    nfeNumberError,
    setNumberPreviewState,
    setManualNumberInput,
  } = useNfeSequencePreview({ orderId: order?.id, currentModel, environment });

  // 5. Ações e Mutações de Emissão
  const {
    isSubmitting,
    isPreparingPreview,
    isRestartingHml,
    emissionResult,
    xmlPreview,
    isXmlPreviewOpen,
    hasCurrentXmlPreview,
    closeXmlPreview,
    fiscalFieldError,
    clearFiscalFieldError,
    handleEmit,
    handlePreviewXml,
    handleReconcile,
    handleStartFreshHmlEmission,
    handleAbandonHmlTlsAttempt,
    handlePrintDanfe,
  } = useNfeEmissionActions({
    fiscalOperationLock,
    canUsePreparation,
    order,
    environment,
    canOperateFiscal,
    operatorId: profile?.id,
    modelDecision,
    currentModel,
    deliveryMethod,
    requiresExplicitAcquisitionPurpose,
    isSavingAcquisitionPurpose,
    isSavingPreparation,
    preparationSaveError,
    acquisitionPurpose,
    finalConsumer,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    nfeNumberSequence,
    manualNumberInput,
    recipientTaxId,
    recipientIe,
    recipientIeIndicator,
    resolvedTransport,
    thirdPartyTransporter,
    onSuccess,
    setRecipientTaxIdError,
    setNumberPreviewState,
    setManualNumberInput,
  });

  return {
    acquisitionPurpose,
    handleAcquisitionPurposeChange,
    requiresExplicitAcquisitionPurpose,
    finalConsumer,
    modelDecision,
    canOperateFiscal,
    environment,
    setEnvironment,
    isSubmitting,
    isPreparingPreview,
    isRestartingHml,
    isSavingAcquisitionPurpose,
    isSavingPreparation,
    preparationSaveError,
    preparationSaveBlocked,
    numberPreview,
    nfeNumberSequence,
    isLoadingNfeNumber,
    nfeNumberError,
    setNumberPreview: setManualNumberInput,
    emissionResult,
    xmlPreview,
    isXmlPreviewOpen,
    hasCurrentXmlPreview,
    closeXmlPreview,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    fiscalFieldError,
    clearFiscalFieldError,
    handleSaveDraft,
    recipientTaxIdError,
    recipientTaxId,
    setRecipientTaxId,
    recipientIe,
    setRecipientIe,
    recipientIeIndicator,
    setRecipientIeIndicator,
    recipientIeError,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
    handleEmit,
    handlePreviewXml,
    handleReconcile,
    handleAbandonHmlTlsAttempt,
    handleStartFreshHmlEmission,
    handlePrintDanfe,
    transportResponsible,
    setTransportResponsible,
    freightContractResponsible,
    setFreightContractResponsible,
    thirdPartyTransporter,
    setThirdPartyTransporter,
    resolvedTransport,
    transportType,
    freightMode,
    setFreightMode: () => {},
  };
}

export default useNfeEmission;
