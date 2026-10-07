import React from 'react';
import type Order from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { NfeCustomerTab } from '../NfeCustomerTab';
import { NfeGeneralTab } from '../NfeGeneralTab';
import { NfeItemsSection } from '../NfeItemsSection';
import { NfePaymentTab } from '../NfePaymentTab';
import { NfeTransportSection } from '../NfeTransportSection';
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import type { ThirdPartyTransporterForm } from '../NfeTransportSection';
import type { NfeTabId, FiscalFieldError } from '../types/nfeEmission.types';

export interface NfeEmissionPanelsProps {
  activeTab: NfeTabId;
  setActiveTab: (tab: NfeTabId) => void;
  order: Order;
  environment: 1 | 2;
  productionConfirmed: boolean;
  finalConsumer: boolean;
  setFinalConsumer: (val: boolean) => void;
  modelReason?: string;
  numberPreview: string;
  setNumberPreview: (val: string | null) => void;
  numberPreviewContext: string;
  nfeNumberError: string | null;
  isSubmitting: boolean;
  isLocked: boolean;
  emissionResult: NfeEmissionResult | null;
  retryNumber: string;
  setRetryNumber: (val: string) => void;
  handleEmit: (productionConfirmed?: boolean, isRetry?: boolean, retryNumber?: number) => void;
  canOperateFiscal: boolean;
  isLoadingFiscalData: boolean;
  isLoadingNfeNumber: boolean;
  handleReconcile: () => void;
  handleAbandonHmlTlsAttempt: () => void;
  handleStartFreshHmlEmission: () => void;
  onClose: () => void;
  customerPersonType?: 'PF' | 'PJ';
  isIdentityOptional: boolean;
  recipientTaxId: string;
  setRecipientTaxId: (val: string) => void;
  handleSaveDraft: () => void;
  recipientTaxIdError: string | null;
  recipientTaxIdInput: React.RefObject<HTMLInputElement>;
  recipientRequirements: { documentType?: string; message?: string };
  recipientIe?: string;
  setRecipientIe?: (val: string) => void;
  recipientIeIndicator?: '1' | '2' | '9';
  setRecipientIeIndicator?: (val: '1' | '2' | '9') => void;
  recipientIeError?: string | null;
  nfeItems: NfeItemWithFiscal[];
  fiscalFieldError: FiscalFieldError | null;
  clearFiscalFieldError: () => void;
  handleUpdateItemFiscal: (index: number, updates: any) => void;
  handleBatchUpdateItems: (updated: NfeItemWithFiscal[]) => void;
  selectedModel?: '55' | '65';
  transportResponsible: any;
  setTransportResponsible: (val: any) => void;
  freightContractResponsible: any;
  setFreightContractResponsible: (val: any) => void;
  thirdPartyTransporter: ThirdPartyTransporterForm;
  setThirdPartyTransporter: (val: ThirdPartyTransporterForm) => void;
  itemsTotal: number;
  freightTotal: number;
  discountTotal: number;
  invoiceTotal: number;
}

export const NfeEmissionPanels: React.FC<NfeEmissionPanelsProps> = ({
  activeTab,
  setActiveTab,
  order,
  environment,
  productionConfirmed,
  finalConsumer,
  setFinalConsumer,
  modelReason,
  numberPreview,
  setNumberPreview,
  numberPreviewContext,
  nfeNumberError,
  isSubmitting,
  isLocked,
  emissionResult,
  retryNumber,
  setRetryNumber,
  handleEmit,
  canOperateFiscal,
  isLoadingFiscalData,
  isLoadingNfeNumber,
  handleReconcile,
  handleAbandonHmlTlsAttempt,
  handleStartFreshHmlEmission,
  onClose,
  customerPersonType,
  isIdentityOptional,
  recipientTaxId,
  setRecipientTaxId,
  handleSaveDraft,
  recipientTaxIdError,
  recipientTaxIdInput,
  recipientRequirements,
  recipientIe,
  setRecipientIe,
  recipientIeIndicator,
  setRecipientIeIndicator,
  recipientIeError,
  nfeItems,
  fiscalFieldError,
  clearFiscalFieldError,
  handleUpdateItemFiscal,
  handleBatchUpdateItems,
  selectedModel,
  transportResponsible,
  setTransportResponsible,
  freightContractResponsible,
  setFreightContractResponsible,
  thirdPartyTransporter,
  setThirdPartyTransporter,
  itemsTotal,
  freightTotal,
  discountTotal,
  invoiceTotal,
}) => {
  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/50 p-4 dark:bg-slate-950/20 custom-scrollbar sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Aba 1: Informações Gerais */}
        <section
          role="tabpanel"
          id="tabpanel-general"
          aria-labelledby="tab-general"
          className={activeTab === 'general' ? 'block' : 'hidden'}
        >
          <NfeGeneralTab
            environment={environment}
            productionConfirmed={productionConfirmed}
            order={order}
            finalConsumer={finalConsumer}
            onFinalConsumerChange={setFinalConsumer}
            modelReason={modelReason}
            numberPreview={numberPreview}
            onNumberPreviewChange={setNumberPreview}
            numberPreviewContext={numberPreviewContext}
            nfeNumberError={nfeNumberError}
            isSubmitting={isSubmitting}
            isLocked={isLocked}
            emissionResult={emissionResult}
            retryNumber={retryNumber}
            onRetryNumberChange={setRetryNumber}
            onRetry={() =>
              emissionResult?.hmlConfirmedNotFound
                ? handleEmit(productionConfirmed, true)
                : handleEmit(
                    productionConfirmed,
                    false,
                    /^\d{1,9}$/.test(retryNumber) ? Number(retryNumber) : undefined
                  )
            }
            canOperateFiscal={canOperateFiscal}
            isLoadingFiscalData={isLoadingFiscalData}
            isLoadingNfeNumber={isLoadingNfeNumber}
            onReconcile={handleReconcile}
            onAbandonHmlTlsAttempt={handleAbandonHmlTlsAttempt}
            onStartFreshHmlEmission={handleStartFreshHmlEmission}
            onCorrectFiscalData={() => setActiveTab('items')}
            onClose={onClose}
          />
        </section>

        {/* Aba 2: Informações do Cliente */}
        <section
          role="tabpanel"
          id="tabpanel-customer"
          aria-labelledby="tab-customer"
          className={activeTab === 'customer' ? 'block' : 'hidden'}
        >
          <NfeCustomerTab
            order={order}
            customerPersonType={customerPersonType}
            isIdentityOptional={isIdentityOptional}
            recipientTaxId={recipientTaxId}
            onRecipientTaxIdChange={setRecipientTaxId}
            onRecipientTaxIdBlur={handleSaveDraft}
            recipientTaxIdError={recipientTaxIdError}
            recipientTaxIdInputRef={recipientTaxIdInput}
            disabled={isSubmitting || isLocked}
            documentType={recipientRequirements.documentType}
            requirementMessage={recipientRequirements.message}
            recipientIe={recipientIe}
            onRecipientIeChange={setRecipientIe}
            recipientIeIndicator={recipientIeIndicator}
            onRecipientIeIndicatorChange={setRecipientIeIndicator}
            recipientIeError={recipientIeError}
            fiscalModel={selectedModel || '55'}
          />
        </section>

        {/* Aba 3: Itens */}
        <section
          role="tabpanel"
          id="tabpanel-items"
          aria-labelledby="tab-items"
          className={activeTab === 'items' ? 'block' : 'hidden'}
        >
          {!emissionResult?.success && (
            <NfeItemsSection
              order={order}
              environment={environment}
              fiscalModel={selectedModel || '55'}
              finalConsumer={finalConsumer}
              recipientIeIndicator={recipientIeIndicator}
              recipientIe={recipientIe}
              items={nfeItems}
              activeError={fiscalFieldError}
              onClearFieldError={clearFiscalFieldError}
              onUpdateItemFiscal={handleUpdateItemFiscal}
              onUpdateItemFiscalBlur={handleSaveDraft}
              onBatchUpdateItems={handleBatchUpdateItems}
            />
          )}
        </section>

        {/* Aba 4: Transporte */}
        <section
          role="tabpanel"
          id="tabpanel-transport"
          aria-labelledby="tab-transport"
          className={activeTab === 'transport' ? 'block' : 'hidden'}
        >
          {!emissionResult?.success && (
            <NfeTransportSection
              fiscalModel={selectedModel || '55'}
              deliveryMethod={order.shipping?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery'}
              transportResponsible={transportResponsible}
              onTransportResponsibleChange={setTransportResponsible}
              freightContractResponsible={freightContractResponsible}
              onFreightContractResponsibleChange={setFreightContractResponsible}
              thirdPartyTransporter={thirdPartyTransporter}
              onThirdPartyTransporterChange={setThirdPartyTransporter}
              disabled={isSubmitting || isLocked}
            />
          )}
        </section>

        {/* Aba 5: Pagamento */}
        <section
          role="tabpanel"
          id="tabpanel-payment"
          aria-labelledby="tab-payment"
          className={activeTab === 'payment' ? 'block' : 'hidden'}
        >
          <NfePaymentTab
            order={order}
            itemsTotal={itemsTotal}
            freightTotal={freightTotal}
            discountTotal={discountTotal}
            invoiceTotal={invoiceTotal}
          />
        </section>
      </div>
    </main>
  );
};

export default NfeEmissionPanels;
