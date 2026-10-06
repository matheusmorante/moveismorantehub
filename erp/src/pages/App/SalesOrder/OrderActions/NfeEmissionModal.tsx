import React from 'react';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
} from '../../../../../../shared-utils/fiscalDocumentModel';
import { useNfeEmission } from './nfe-modal/useNfeEmission';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { getFiscalIssuePresentation } from '@/pages/utils/nfe/fiscalIssuePresentation';
import { NfeEmissionHeader } from './nfe-modal/components/NfeEmissionHeader';
import { NfeEmissionTabBar } from './nfe-modal/components/NfeEmissionTabBar';
import { NfeEmissionPanels } from './nfe-modal/components/NfeEmissionPanels';
import { NfeEmissionFooter } from './nfe-modal/components/NfeEmissionFooter';
import { useNfeCustomerPersonType } from './nfe-modal/hooks/useNfeCustomerPersonType';
import { useNfeEmissionModalState } from './nfe-modal/hooks/useNfeEmissionModalState';
import type { NfeTabId, NfeEmissionModalProps } from './nfe-modal/types/nfeEmission.types';

export type { NfeTabId };

export const NfeEmissionModal: React.FC<NfeEmissionModalProps> = ({
  isOpen,
  order,
  initialEnvironment,
  onClose,
  onSuccess,
}) => {
  const { customerPersonType, isLoadingCustomerType, emissionOrder } = useNfeCustomerPersonType(order);

  const {
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
    isLoadingFiscalData,
    fiscalPreparationError,
    fiscalFieldError,
    clearFiscalFieldError,
    recipientTaxIdError,
    recipientTaxId,
    setRecipientTaxId,
    handleSaveDraft,
    setNumberPreview,
    emissionResult,
    nfeItems,
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
  } = useNfeEmission(emissionOrder, (result: NfeEmissionResult) => {
    onSuccess?.(result);
    onClose();
  });

  const {
    activeTab,
    setActiveTab,
    productionConfirmed,
    retryNumber,
    setRetryNumber,
    recipientTaxIdInput,
  } = useNfeEmissionModalState({
    isOpen,
    order,
    emissionOrder,
    initialEnvironment,
    environment,
    setEnvironment,
    setRecipientTaxId,
    fiscalFieldError,
    recipientTaxIdError,
    emissionResult,
  });

  if (!isOpen || !order) return null;

  const isPreparingInitialData = isLoadingFiscalData || isLoadingCustomerType;
  const isLocked = Boolean(
    emissionResult?.success ||
      emissionResult?.pending ||
      emissionResult?.hmlConfirmedNotFound ||
      (emissionResult && getFiscalIssuePresentation(emissionResult).action === 'consult')
  );

  const selectedModel =
    emissionResult?.model || (modelDecision?.status === 'ready' ? modelDecision.model : undefined);
  const modelLabel =
    selectedModel === '65'
      ? 'NFC-e · modelo 65'
      : selectedModel === '55'
        ? 'NF-e · modelo 55 necessária'
        : 'Modelo fiscal a definir';
  const numberPreviewContext = `Série ${nfeNumberSequence.series ?? '—'} · ${environment === 2 ? 'Homologação' : 'Produção'}`;

  const itemsTotal = (nfeItems.length ? nfeItems : order.items || [])
    .filter((it) => it.itemType !== 'service')
    .reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
  const freightTotal = Number(order.shipping?.value) || 0;
  const discountTotal = Number(order.itemsSummary?.totalFixedDiscount) || 0;
  const invoiceTotal =
    Number(order.paymentsSummary?.totalOrderValue) || itemsTotal + freightTotal - discountTotal;

  const currentPresence = fiscalPresence(
    selectedModel || '55',
    order.shipping?.deliveryMethod,
    order.fiscalContext?.presence
  );
  const recipientRequirements = decideFiscalRecipientRequirements({
    model: selectedModel || '55',
    presence: currentPresence,
    total: invoiceTotal,
    personType: customerPersonType,
    recipientTaxId,
    operationScope: 'NORMAL_DOMESTIC_SALE',
  });
  const isIdentityOptional =
    recipientRequirements.supported && !recipientRequirements.documentRequired;
  const isNfce = selectedModel === '65';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Emitir nota fiscal de saída"
      aria-busy={isPreparingInitialData}
      className="fixed inset-0 z-[999999] flex h-full min-h-0 w-full flex-col overflow-hidden overscroll-none bg-white dark:bg-slate-900 animate-in fade-in duration-150"
    >
      <NfeEmissionHeader
        order={order}
        modelLabel={modelLabel}
        environment={environment}
        onClose={onClose}
      />

      <NfeEmissionTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <NfeEmissionPanels
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        order={order}
        environment={environment}
        productionConfirmed={productionConfirmed}
        finalConsumer={finalConsumer}
        setFinalConsumer={setFinalConsumer}
        modelReason={modelDecision?.reason}
        numberPreview={numberPreview}
        setNumberPreview={setNumberPreview}
        numberPreviewContext={numberPreviewContext}
        nfeNumberError={nfeNumberError}
        isSubmitting={isSubmitting}
        isLocked={isLocked}
        emissionResult={emissionResult}
        retryNumber={retryNumber}
        setRetryNumber={setRetryNumber}
        handleEmit={handleEmit}
        canOperateFiscal={canOperateFiscal}
        isLoadingFiscalData={isLoadingFiscalData}
        isLoadingNfeNumber={isLoadingNfeNumber}
        fiscalPreparationError={fiscalPreparationError}
        handleReconcile={handleReconcile}
        handleAbandonHmlTlsAttempt={handleAbandonHmlTlsAttempt}
        handleStartFreshHmlEmission={handleStartFreshHmlEmission}
        onClose={onClose}
        customerPersonType={customerPersonType}
        isIdentityOptional={isIdentityOptional}
        recipientTaxId={recipientTaxId}
        setRecipientTaxId={setRecipientTaxId}
        handleSaveDraft={handleSaveDraft}
        recipientTaxIdError={recipientTaxIdError}
        recipientTaxIdInput={recipientTaxIdInput}
        recipientRequirements={recipientRequirements}
        nfeItems={nfeItems}
        fiscalFieldError={fiscalFieldError}
        clearFiscalFieldError={clearFiscalFieldError}
        handleUpdateItemFiscal={handleUpdateItemFiscal}
        handleBatchUpdateItems={handleBatchUpdateItems}
        selectedModel={selectedModel}
        transportResponsible={transportResponsible}
        setTransportResponsible={setTransportResponsible}
        freightContractResponsible={freightContractResponsible}
        setFreightContractResponsible={setFreightContractResponsible}
        thirdPartyTransporter={thirdPartyTransporter}
        setThirdPartyTransporter={setThirdPartyTransporter}
        itemsTotal={itemsTotal}
        freightTotal={freightTotal}
        discountTotal={discountTotal}
        invoiceTotal={invoiceTotal}
      />

      <NfeEmissionFooter
        invoiceTotal={invoiceTotal}
        environment={environment}
        isNfce={isNfce}
        canOperateFiscal={canOperateFiscal}
        isSubmitting={isSubmitting}
        isLoadingFiscalData={isLoadingFiscalData}
        isLoadingNfeNumber={isLoadingNfeNumber}
        isLoadingCustomerType={isLoadingCustomerType}
        fiscalPreparationError={fiscalPreparationError}
        emissionResult={emissionResult}
        productionConfirmed={productionConfirmed}
        onClose={onClose}
        onEmit={handleEmit}
        onPrintDanfe={handlePrintDanfe}
      />

      {isPreparingInitialData && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-300/85 text-slate-700 backdrop-blur-[1px] dark:bg-slate-950/80 dark:text-slate-100"
        >
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-500/30 border-t-blue-600 dark:border-slate-500/40 dark:border-t-blue-400" />
          <span className="text-sm font-semibold">Carregando dados do cliente e dos produtos…</span>
        </div>
      )}
    </div>
  );
};

export default NfeEmissionModal;
