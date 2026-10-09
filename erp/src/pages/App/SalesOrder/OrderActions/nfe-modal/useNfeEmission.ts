import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { updateOrder } from '@/pages/utils/orderHistoryService';
import { getSettings } from '@/pages/utils/settingsService';
import { resolveFiscalCfopOrderScope } from '../../../../../../../shared-utils/fiscalCfopModel';
import { resolveOrderFiscalModel } from '../../../../../../../shared-utils/fiscalDocumentModel';
import type { DeliveryMethod } from '../../../../../../../shared-utils/fiscalTransportModel';
import { useNfeEmissionActions } from './hooks/useNfeEmissionActions';
import { useNfeItemEnrichment } from './hooks/useNfeItemEnrichment';
import { useNfeRecipientTaxId } from './hooks/useNfeRecipientTaxId';
import { useNfeSequencePreview } from './hooks/useNfeSequencePreview';
import { useNfeTransport } from './hooks/useNfeTransport';
import { saveNfeDraftToDatabase } from './services/nfeDraftService';
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
  const [isSavingAcquisitionPurpose, setIsSavingAcquisitionPurpose] = useState(false);
  const purposeSaveInProgress = useRef(false);
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
    model: currentModel,
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

  const handleAcquisitionPurposeChange = async (purpose: FiscalAcquisitionPurpose) => {
    if (purposeSaveInProgress.current) return;
    if (!order?.id) {
      toast.error('Salve o pedido antes de registrar a finalidade da compra.');
      return;
    }

    purposeSaveInProgress.current = true;
    setIsSavingAcquisitionPurpose(true);
    try {
      await updateOrder(order.id, {
        fiscalContext: {
          ...order.fiscalContext,
          acquisitionPurpose: purpose,
          finalConsumer: purpose !== 'resale',
        },
      });
      setSavedAcquisitionPurpose(purpose);
    } catch {
      toast.error('Não foi possível salvar a finalidade da compra no pedido.');
    } finally {
      purposeSaveInProgress.current = false;
      setIsSavingAcquisitionPurpose(false);
    }
  };

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
    order,
    environment,
    canOperateFiscal,
    modelDecision,
    currentModel,
    deliveryMethod,
    requiresExplicitAcquisitionPurpose,
    isSavingAcquisitionPurpose,
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

  const handleSaveDraft = async () => {
    if (purposeSaveInProgress.current) return;
    await saveNfeDraftToDatabase(modelOrder, recipientTaxId, nfeItems);
  };

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
    isSavingAcquisitionPurpose,
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
