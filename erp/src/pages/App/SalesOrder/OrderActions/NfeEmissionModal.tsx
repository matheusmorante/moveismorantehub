import React from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import {
  getFiscalIssuePresentation,
  HML_INTERSTATE_MATRIX_NOT_APPROVED,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { NfeEmissionFooter } from './nfe-modal/components/NfeEmissionFooter';
import { NfeEmissionHeader } from './nfe-modal/components/NfeEmissionHeader';
import { NfeEmissionPanels } from './nfe-modal/components/NfeEmissionPanels';
import { NfeEmissionStatusBanners } from './nfe-modal/components/NfeEmissionStatusBanners';
import { NfeEmissionTabBar } from './nfe-modal/components/NfeEmissionTabBar';
import { NfeFiscalIssueModal } from './nfe-modal/components/NfeFiscalIssueModal';
import { NfeXmlPreviewDialog } from './nfe-modal/components/NfeXmlPreviewDialog';
import { useNfeCustomerPersonType } from './nfe-modal/hooks/useNfeCustomerPersonType';
import { useNfeEmissionModalState } from './nfe-modal/hooks/useNfeEmissionModalState';
import { useNfeEmissionTelemetry } from './nfe-modal/hooks/useNfeEmissionTelemetry';
import type { NfeEmissionModalProps, NfeTabId } from './nfe-modal/types/nfeEmission.types';
import { useNfeEmission } from './nfe-modal/useNfeEmission';
import {
  computeInvoiceTotals,
  resolveModelLabel,
  resolveNumberPreviewContext,
  resolveRecipientRequirementsForModal,
} from './nfe-modal/utils/nfeModalCalculations';

export type { NfeTabId };

export const NfeEmissionModal: React.FC<NfeEmissionModalProps> = ({
  isOpen,
  order,
  initialEnvironment,
  emissionOpenedAt,
  onClose,
  onSuccess,
}) => {
  const { isRealAdministrator, activeRoleMode } = useAuth();
  const canPreviewXml = isRealAdministrator && !activeRoleMode;
  const orderId = order?.id;
  const { customerPersonType, isLoadingCustomerType, emissionOrder } =
    useNfeCustomerPersonType(order);

  const {
    acquisitionPurpose,
    handleAcquisitionPurposeChange,
    finalConsumer,
    modelDecision,
    canOperateFiscal,
    environment,
    setEnvironment,
    isSubmitting,
    isRestoringAttempt,
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
    isLoadingFiscalData,
    fiscalPreparationError,
    fiscalFieldError,
    clearFiscalFieldError,
    recipientTaxIdError,
    recipientTaxId,
    setRecipientTaxId,
    recipientIe,
    setRecipientIe,
    recipientIeIndicator,
    setRecipientIeIndicator,
    recipientIeError,
    handleSaveDraft,
    setNumberPreview,
    emissionResult,
    xmlPreview,
    isXmlPreviewOpen,
    closeXmlPreview,
    handlePreviewXml,
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
  } = useNfeEmission(isOpen ? emissionOrder : null, (result: NfeEmissionResult) => {
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
    isLoadingCustomerType,
    initialEnvironment,
    environment,
    setEnvironment,
    setRecipientTaxId,
    fiscalFieldError,
    recipientTaxIdError,
    emissionResult,
  });

  const { handleTransmissionEnabled } = useNfeEmissionTelemetry({
    isOpen,
    orderId,
    environment,
    emissionOpenedAt,
  });

  const [isFiscalIssueModalOpen, setIsFiscalIssueModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) setIsFiscalIssueModalOpen(false);
  }, [isOpen]);

  React.useEffect(() => {
    if (
      emissionResult?.technicalDetails?.apiCode === HML_INTERSTATE_MATRIX_NOT_APPROVED &&
      emissionResult.error?.startsWith(`${HML_INTERSTATE_MATRIX_NOT_APPROVED}:`)
    ) {
      setIsFiscalIssueModalOpen(true);
    }
  }, [emissionResult?.error, emissionResult?.technicalDetails?.apiCode]);

  if (!isOpen || !order) return null;

  const isPreparingInitialData = isLoadingFiscalData || isLoadingCustomerType;
  const isPreparingNfe = isPreparingInitialData;
  const preparationMessage = isRestoringAttempt
    ? 'Conferindo tentativas fiscais anteriores…'
    : isLoadingFiscalData
    ? 'Carregando dados do cliente e dos produtos…'
    : 'Confirmando os dados fiscais do cliente…';
  const isLocked = Boolean(
    emissionResult?.success ||
      emissionResult?.pending ||
      emissionResult?.hmlConfirmedNotFound ||
      (emissionResult && getFiscalIssuePresentation(emissionResult).action === 'consult')
  );

  const selectedModel =
    emissionResult?.model || (modelDecision?.status === 'ready' ? modelDecision.model : undefined);
  const isNfce = selectedModel === '65';
  const modelLabel = resolveModelLabel(selectedModel);
  const numberPreviewContext = resolveNumberPreviewContext({
    emissionResult,
    nfeNumberSequence,
    environment,
  });

  const { itemsTotal, freightTotal, discountTotal, invoiceTotal } = computeInvoiceTotals({
    order,
    nfeItems,
  });

  const recipientRequirements = resolveRecipientRequirementsForModal({
    selectedModel,
    order,
    invoiceTotal,
    customerPersonType,
    recipientTaxId,
  });
  const isIdentityOptional =
    recipientRequirements.supported && !recipientRequirements.documentRequired;

  const issueCopy = emissionResult ? getFiscalIssuePresentation(emissionResult) : null;
  const hasFiscalIssue = Boolean(emissionResult && !emissionResult.success && issueCopy);

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
        hasFiscalIssue={hasFiscalIssue}
        fiscalIssueTone={issueCopy?.tone}
        onOpenFiscalIssue={() => setIsFiscalIssueModalOpen(true)}
      />

      <NfeEmissionTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <NfeEmissionStatusBanners
        fiscalPreparationError={fiscalPreparationError}
        isPreparingNfe={isPreparingNfe}
        preparationMessage={preparationMessage}
        isSubmitting={isSubmitting}
        isRestartingHml={isRestartingHml}
        isFiscalIssueModalOpen={isFiscalIssueModalOpen}
        isNfce={isNfce}
        environment={environment}
        emissionResult={emissionResult}
        isSavingPreparation={isSavingPreparation}
        preparationSaveError={preparationSaveError}
      />

      <NfeEmissionPanels
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        order={order}
        environment={environment}
        productionConfirmed={productionConfirmed}
        acquisitionPurpose={acquisitionPurpose}
        onAcquisitionPurposeChange={handleAcquisitionPurposeChange}
        isSavingAcquisitionPurpose={isSavingAcquisitionPurpose}
        finalConsumer={finalConsumer}
        modelReason={modelDecision?.reason}
        numberPreview={numberPreview}
        setNumberPreview={setNumberPreview}
        numberPreviewContext={numberPreviewContext}
        nfeNumberError={nfeNumberError}
        isSubmitting={isSubmitting}
        isLocked={isLocked || isSavingAcquisitionPurpose || preparationSaveBlocked}
        emissionResult={emissionResult}
        retryNumber={retryNumber}
        setRetryNumber={setRetryNumber}
        handleEmit={handleEmit}
        canOperateFiscal={canOperateFiscal}
        isLoadingCustomerType={isLoadingCustomerType}
        isLoadingFiscalData={isLoadingFiscalData}
        isLoadingNfeNumber={isLoadingNfeNumber}
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
        recipientIe={recipientIe}
        setRecipientIe={setRecipientIe}
        recipientIeIndicator={recipientIeIndicator}
        setRecipientIeIndicator={setRecipientIeIndicator}
        recipientIeError={recipientIeError}
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
        isOperationIncomplete={
          isSavingPreparation || Boolean(preparationSaveError) || finalConsumer === undefined
        }
        invoiceTotal={invoiceTotal}
        environment={environment}
        isNfce={isNfce}
        canOperateFiscal={canOperateFiscal}
        isSubmitting={isSubmitting}
        isPreparingPreview={isPreparingPreview}
        isLoadingFiscalData={isLoadingFiscalData}
        isLoadingCustomerType={isLoadingCustomerType}
        fiscalPreparationError={fiscalPreparationError}
        onOpenFiscalIssue={() => setIsFiscalIssueModalOpen(true)}
        emissionResult={emissionResult}
        productionConfirmed={productionConfirmed}
        canPreviewXml={canPreviewXml}
        onPreview={() => void handlePreviewXml(productionConfirmed)}
        onClose={onClose}
        onEmit={(confirmed, retry) => {
          if (isLoadingCustomerType) {
            toast.info('Aguarde a identificação fiscal do cliente antes de emitir.');
            return;
          }
          void handleEmit(confirmed, retry);
        }}
        onPrintDanfe={handlePrintDanfe}
        onTransmissionEnabled={handleTransmissionEnabled}
      />

      <NfeXmlPreviewDialog
        isOpen={isXmlPreviewOpen}
        canPreviewXml={canPreviewXml}
        xmlPreview={xmlPreview}
        onClose={closeXmlPreview}
      />

      <NfeFiscalIssueModal
        isOpen={isFiscalIssueModalOpen && (hasFiscalIssue || Boolean(fiscalPreparationError))}
        onClose={() => setIsFiscalIssueModalOpen(false)}
        emissionResult={emissionResult}
        environment={environment}
        productionConfirmed={productionConfirmed}
        retryNumber={retryNumber}
        onRetryNumberChange={setRetryNumber}
        onRetry={() => {
          setIsFiscalIssueModalOpen(false);
          if (emissionResult?.hmlConfirmedNotFound) {
            handleEmit(productionConfirmed, true);
          } else {
            handleEmit(
              productionConfirmed,
              false,
              /^\d{1,9}$/.test(retryNumber) ? Number(retryNumber) : undefined
            );
          }
        }}
        canOperateFiscal={canOperateFiscal}
        isSubmitting={isSubmitting}
        isLoadingFiscalData={isLoadingFiscalData}
        fiscalPreparationError={fiscalPreparationError}
        onReconcile={async () => {
          const outcome = await handleReconcile();
          if (outcome?.state === 'authorized') {
            setIsFiscalIssueModalOpen(false);
          }
        }}
        onAbandonHmlTlsAttempt={() => {
          setIsFiscalIssueModalOpen(false);
          void handleAbandonHmlTlsAttempt();
        }}
        onStartFreshHmlEmission={() => {
          setIsFiscalIssueModalOpen(false);
          void handleStartFreshHmlEmission();
        }}
        onCorrectFiscalData={() => {
          setIsFiscalIssueModalOpen(false);
          setActiveTab('items');
        }}
      />
    </div>
  );
};

export default NfeEmissionModal;
