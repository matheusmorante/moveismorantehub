import React from 'react';
import {
  getFiscalIssuePresentation,
  HML_INTERSTATE_MATRIX_NOT_APPROVED,
  isHmlInterstateMatrixBlock,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
} from '../../../../../../shared-utils/fiscalDocumentModel';
import {
  recordNfeEmissionReadiness,
  withNfeEmissionStage,
} from '../../../../../../src/telemetry/nfeEmissionPerformance';
import { NfeEmissionFooter } from './nfe-modal/components/NfeEmissionFooter';
import { NfeEmissionHeader } from './nfe-modal/components/NfeEmissionHeader';
import { NfeEmissionPanels } from './nfe-modal/components/NfeEmissionPanels';
import { NfeEmissionTabBar } from './nfe-modal/components/NfeEmissionTabBar';
import { NfeFiscalIssueModal } from './nfe-modal/components/NfeFiscalIssueModal';
import { useNfeCustomerPersonType } from './nfe-modal/hooks/useNfeCustomerPersonType';
import { useNfeEmissionModalState } from './nfe-modal/hooks/useNfeEmissionModalState';
import type { NfeEmissionModalProps, NfeTabId } from './nfe-modal/types/nfeEmission.types';
import { useNfeEmission } from './nfe-modal/useNfeEmission';

export type { NfeTabId };

export const NfeEmissionModal: React.FC<NfeEmissionModalProps> = ({
  isOpen,
  order,
  initialEnvironment,
  emissionOpenedAt,
  onClose,
  onSuccess,
}) => {
  const orderId = order?.id;
  const emissionStartedAtRef = React.useRef<number | null>(null);
  const readinessRecordedForRef = React.useRef<number | null>(null);
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
    isPreparingPreview,
    isSavingAcquisitionPurpose,
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
    hasCurrentXmlPreview,
    closeXmlPreview,
    nfeItems,
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

  const handleTransmissionEnabled = React.useCallback(() => {
    const startedAt = emissionStartedAtRef.current;
    if (startedAt === null || readinessRecordedForRef.current === startedAt) return;

    readinessRecordedForRef.current = startedAt;
    recordNfeEmissionReadiness(startedAt, { environment });
  }, [environment]);

  React.useLayoutEffect(() => {
    if (!isOpen || orderId == null) {
      emissionStartedAtRef.current = null;
      readinessRecordedForRef.current = null;
      return;
    }

    const startedAt =
      emissionOpenedAt ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    emissionStartedAtRef.current = startedAt;
    readinessRecordedForRef.current = null;

    let frameId: number | undefined;
    let finishTiming: (() => void) | undefined;
    const visibleFrame = new Promise<void>((resolve) => {
      finishTiming = resolve;
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        frameId = window.requestAnimationFrame(() => resolve());
      } else {
        resolve();
      }
    });
    void withNfeEmissionStage('modal_open', () => visibleFrame);

    return () => {
      if (frameId !== undefined && typeof window !== 'undefined') {
        window.cancelAnimationFrame(frameId);
      }
      finishTiming?.();
    };
  }, [isOpen, orderId, emissionOpenedAt]);

  if (!isOpen || !order) return null;

  const isPreparingInitialData = isLoadingFiscalData || isLoadingCustomerType;
  const isPreparingNfe = isPreparingInitialData;
  const preparationMessage = isLoadingFiscalData
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
  const modelLabel =
    selectedModel === '65'
      ? 'NFC-e · modelo 65'
      : selectedModel === '55'
        ? 'NF-e · modelo 55 necessária'
        : 'Modelo fiscal a definir';
  const numberPreviewContext = `Prévia informativa · Série ${nfeNumberSequence.series ?? '—'} · ${environment === 2 ? 'Homologação' : 'Produção'}`;

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

      {fiscalPreparationError && !isHmlInterstateMatrixBlock(fiscalPreparationError) && (
        <div
          role="alert"
          className="mx-3 mt-2 shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 sm:mx-6"
        >
          {safeFiscalIssueMessage(
            fiscalPreparationError,
            'Não foi possível carregar a preparação fiscal. Atualize os dados e tente novamente.'
          )}
        </div>
      )}

      {isPreparingNfe && (
        <div
          role="status"
          aria-live="polite"
          className="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 sm:mx-6"
        >
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        <span>{preparationMessage}</span>
        </div>
      )}

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
        isLocked={isLocked}
        emissionResult={emissionResult}
        retryNumber={retryNumber}
        setRetryNumber={setRetryNumber}
        handleEmit={handleEmit}
        canOperateFiscal={canOperateFiscal}
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
        isOperationIncomplete={isSavingAcquisitionPurpose || finalConsumer === undefined}
        invoiceTotal={invoiceTotal}
        environment={environment}
        isNfce={isNfce}
        canOperateFiscal={canOperateFiscal}
        isSubmitting={isSubmitting}
        isPreparingPreview={isPreparingPreview}
        hasCurrentXmlPreview={hasCurrentXmlPreview}
        isLoadingFiscalData={isLoadingFiscalData}
        isLoadingCustomerType={isLoadingCustomerType}
        fiscalPreparationError={fiscalPreparationError}
        onOpenFiscalIssue={() => setIsFiscalIssueModalOpen(true)}
        emissionResult={emissionResult}
        productionConfirmed={productionConfirmed}
        onClose={onClose}
        onEmit={handleEmit}
        onPreview={handlePreviewXml}
        onPrintDanfe={handlePrintDanfe}
        onTransmissionEnabled={handleTransmissionEnabled}
      />

      {xmlPreview && isXmlPreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="nfe-xml-preview-title"
          data-testid="nfe-xml-preview-dialog"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
        >
          <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-6">
              <div>
                <h2 id="nfe-xml-preview-title" className="text-sm font-black text-slate-900 dark:text-white">
                  Prévia do XML — ainda não transmitida
                </h2>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  Esta prévia está assinada para conferência, mas não é documento autorizado pela SEFAZ.
                  Qualquer alteração nas escolhas fiscais exige gerar uma nova prévia.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar prévia do XML"
                data-testid="nfe-xml-preview-close"
                onClick={closeXmlPreview}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Fechar
              </button>
            </header>
            <pre
              data-testid="nfe-xml-preview-content"
              className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all bg-slate-50 p-4 font-mono text-[11px] leading-5 text-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:p-6"
            >
              {xmlPreview.xml}
            </pre>
          </section>
        </div>
      )}

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
        onReconcile={() => {
          setIsFiscalIssueModalOpen(false);
          void handleReconcile();
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
