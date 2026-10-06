import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type Order from '@/pages/types/order.type';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { resolveOrderFiscalModel } from '../../../../../../../shared-utils/fiscalDocumentModel';
import { getSettings } from '@/pages/utils/settingsService';
import type { DeliveryMethod } from '../../../../../../../shared-utils/fiscalTransportModel';
import {
  clearFiscalEmissionDrafts,
  draftKey,
  emissionContexts,
  fiscalDrafts,
  type FiscalFieldError,
} from './types/nfeEmission.types';
import { saveNfeDraftToDatabase } from './services/nfeDraftService';
import { useNfeSequencePreview } from './hooks/useNfeSequencePreview';
import { useNfeItemEnrichment } from './hooks/useNfeItemEnrichment';
import { useNfeTransport } from './hooks/useNfeTransport';
import { useNfeRecipientTaxId } from './hooks/useNfeRecipientTaxId';
import { useNfeEmissionActions } from './hooks/useNfeEmissionActions';

export { clearFiscalEmissionDrafts };
export type { FiscalFieldError };

export function useNfeEmission(
  order: Order | null,
  onSuccess?: (result: NfeEmissionResult) => void
) {
  const { profile } = useAuth();
  const canOperateFiscal = hasFiscalOperationRole(profile);
  const [environment, setEnvironment] = useState<1 | 2>(DEFAULT_NFE_ENVIRONMENT);

  const contextKey = order ? draftKey(order, environment) : '';
  const [finalConsumer, setFinalConsumer] = useState(
    () =>
      emissionContexts.get(contextKey)?.finalConsumer ?? order?.fiscalContext?.finalConsumer ?? true
  );

  const deliveryMethod: DeliveryMethod =
    order?.shipping?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery';

  const manualFiscalFields = useRef(fiscalDrafts);

  const modelDecision = order
    ? resolveOrderFiscalModel(order, { issuerUf: getSettings().companyUF, finalConsumer })
    : null;
  const currentModel: '55' | '65' = modelDecision?.status === 'ready' ? modelDecision.model : '55';
  const {
    recipientTaxId,
    setRecipientTaxId,
    recipientTaxIdError,
    setRecipientTaxIdError,
  } = useNfeRecipientTaxId({ order, currentModel });

  // 1. Itens e Enriquecimento Fiscal
  const {
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
  } = useNfeItemEnrichment({ order, environment, manualFiscalFields, finalConsumer, recipientTaxId, model: currentModel });

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
    const saved = emissionContexts.get(contextKey);
    setFinalConsumer(saved?.finalConsumer ?? order?.fiscalContext?.finalConsumer ?? true);
  }, [contextKey, order?.fiscalContext?.finalConsumer]);

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
    emissionResult,
    fiscalFieldError,
    clearFiscalFieldError,
    handleEmit,
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
    finalConsumer,
    contextKey,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    nfeNumberSequence,
    manualNumberInput,
    recipientTaxId,
    resolvedTransport,
    thirdPartyTransporter,
    onSuccess,
    setRecipientTaxIdError,
    setNumberPreviewState,
    setManualNumberInput,
  });

  const handleSaveDraft = async () => {
    await saveNfeDraftToDatabase(order, recipientTaxId, nfeItems);
  };

  return {
    finalConsumer,
    setFinalConsumer,
    modelDecision,
    canOperateFiscal,
    environment,
    setEnvironment,
    isSubmitting,
    numberPreview,
    nfeNumberSequence,
    isLoadingNfeNumber,
    nfeNumberError,
    setNumberPreview: setManualNumberInput,
    emissionResult,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    fiscalFieldError,
    clearFiscalFieldError,
    handleSaveDraft,
    recipientTaxIdError,
    recipientTaxId,
    setRecipientTaxId,
    handleUpdateItemFiscal,
    handleBatchUpdateItems,
    handleEmit,
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
