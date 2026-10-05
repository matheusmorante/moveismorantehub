import React from 'react';
import type Order from '@/pages/types/order.type';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import { fetchPersonById } from '@/pages/utils/personService';
import {
  decideFiscalRecipientRequirements,
  fiscalPresence,
} from '../../../../../../shared-utils/fiscalDocumentModel';
import {
  formatRecipientTaxId,
  recipientTaxIdKind,
} from '../../../../../../shared-utils/recipientTaxId';
import { NfeCustomerTab } from './nfe-modal/NfeCustomerTab';
import { NfeGeneralTab } from './nfe-modal/NfeGeneralTab';
import { NfeItemsSection } from './nfe-modal/NfeItemsSection';
import { NfePaymentTab } from './nfe-modal/NfePaymentTab';
import { NfeSuccessCard } from './nfe-modal/NfeSuccessCard';
import { NfeTransportSection } from './nfe-modal/NfeTransportSection';
import { useNfeEmission } from './nfe-modal/useNfeEmission';
import { getFiscalIssuePresentation } from '@/pages/utils/nfe/fiscalIssuePresentation';
import { fetchOrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeService';
import type { OrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeRules';

const maskRecipientTaxId = (value: string) => {
  if (/[a-z]/i.test(value)) return formatRecipientTaxId(value, 'PJ');
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length > 11) {
    if (digits.length > 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    if (digits.length > 8)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length > 5) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return digits;
  }
  if (digits.length > 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
};

export type NfeTabId = 'general' | 'customer' | 'items' | 'transport' | 'payment';

interface NfeEmissionModalProps {
  isOpen: boolean;
  order: Order | null;
  initialEnvironment?: 1 | 2;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NfeEmissionModal: React.FC<NfeEmissionModalProps> = ({
  isOpen,
  order,
  initialEnvironment,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = React.useState<NfeTabId>('general');
  const [customerPersonType, setCustomerPersonType] = React.useState<'PF' | 'PJ' | undefined>(
    order?.customerData?.personType
  );
  const [isLoadingCustomerType, setIsLoadingCustomerType] = React.useState(
    Boolean(order?.customerData?.id && !order?.customerData?.personType)
  );
  const [fiscalStatuses, setFiscalStatuses] = React.useState<OrderFiscalBadgeStatuses | null>(null);

  React.useEffect(() => {
    let active = true;
    const orderId = order?.id;
    if (!isOpen || !orderId) {
      setFiscalStatuses(null);
      return;
    }

    fetchOrderFiscalBadgeStatuses([orderId])
      .then((res) => {
        if (active && res[orderId]) {
          setFiscalStatuses(res[orderId]);
        }
      })
      .catch((err) => {
        console.error('[NfeEmissionModal] Falha ao consultar status fiscais do pedido:', err);
      });

    return () => {
      active = false;
    };
  }, [isOpen, order?.id]);

  React.useEffect(() => {
    let active = true;
    const loadPersonType = async () => {
      const snapshotType = order?.customerData?.personType;
      const snapshotDocument = order?.customerData?.cpfCnpj || order?.customerData?.document || '';
      if (snapshotType) {
        setCustomerPersonType(snapshotType);
        setIsLoadingCustomerType(false);
        return;
      }
      setCustomerPersonType(
        snapshotDocument
          ? recipientTaxIdKind(snapshotDocument) === 'CNPJ'
            ? 'PJ'
            : 'PF'
          : undefined
      );
      if (!order?.customerData?.id) {
        setIsLoadingCustomerType(false);
        return;
      }
      setIsLoadingCustomerType(true);
      const person = await fetchPersonById(order.customerData.id);
      if (active) {
        if (person?.personType) setCustomerPersonType(person.personType);
        setIsLoadingCustomerType(false);
      }
    };
    void loadPersonType();
    return () => {
      active = false;
    };
  }, [
    order?.id,
    order?.customerData?.id,
    order?.customerData?.personType,
    order?.customerData?.cpfCnpj,
    order?.customerData?.document,
  ]);

  const emissionOrder = React.useMemo(
    () =>
      order && customerPersonType
        ? { ...order, customerData: { ...order.customerData, personType: customerPersonType } }
        : order,
    [order, customerPersonType]
  );

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
  } = useNfeEmission(emissionOrder, onSuccess);

  const [productionConfirmed, setProductionConfirmed] = React.useState(false);
  const [retryNumber, setRetryNumber] = React.useState('');
  const recipientTaxIdInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(
    () =>
      setRecipientTaxId(
        maskRecipientTaxId(
          emissionOrder?.customerData?.cpfCnpj || emissionOrder?.customerData?.document || ''
        )
      ),
    [
      order?.id,
      emissionOrder?.customerData?.cpfCnpj,
      emissionOrder?.customerData?.document,
      setRecipientTaxId,
    ]
  );

  React.useEffect(() => {
    if (fiscalFieldError) {
      setActiveTab(fiscalFieldError.tab);
      const timer = window.setTimeout(() => {
        const el = document.getElementById(fiscalFieldError.fieldId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if ('focus' in el && typeof el.focus === 'function') {
            el.focus();
          }
        }
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [fiscalFieldError]);

  React.useEffect(() => {
    if (recipientTaxIdError && !fiscalFieldError) {
      setActiveTab('customer');
      recipientTaxIdInput.current?.focus();
    }
  }, [recipientTaxIdError, fiscalFieldError]);

  React.useEffect(() => {
    setRetryNumber(emissionResult?.numberConflict?.nextNumber?.toString() ?? '');
  }, [emissionResult?.numberConflict?.previousNumber, emissionResult?.numberConflict?.nextNumber]);

  React.useEffect(() => setProductionConfirmed(false), [environment]);

  React.useEffect(() => {
    if (!isOpen) return;
    const { body, documentElement } = document;
    const previousBody = body.style.overflow;
    const previousHtml = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousBody;
      documentElement.style.overflow = previousHtml;
    };
  }, [isOpen]);

  const isHmlIssued = Boolean(
    fiscalStatuses?.homologation === 'issued' ||
      (order?.nfeData?.status === 'homologada' && order?.nfeData?.environment === 2)
  );
  const isProdIssued = Boolean(
    fiscalStatuses?.production === 'issued' ||
      (order?.nfeData?.status === 'autorizada' && (order?.nfeData?.environment ?? 1) === 1)
  );

  React.useEffect(() => {
    if (isOpen) {
      if (initialEnvironment) {
        setEnvironment(initialEnvironment);
      } else if (isProdIssued && !isHmlIssued) {
        setEnvironment(2);
      } else if (isHmlIssued && !isProdIssued) {
        setEnvironment(1);
      } else {
        setEnvironment(DEFAULT_NFE_ENVIRONMENT);
      }
      setActiveTab('general');
    }
  }, [isOpen, initialEnvironment, isHmlIssued, isProdIssued, setEnvironment]);

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

  // Totais calculados para a aba de Pagamento e regras fiscais
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

  // Definição das 5 Abas solicitadas na ordem estrita
  const tabs = [
    {
      id: 'general' as const,
      label: 'Informações Gerais',
      icon: 'bi-info-circle-fill',
    },
    {
      id: 'customer' as const,
      label: 'Informações do Cliente',
      icon: 'bi-person-fill',
    },
    {
      id: 'items' as const,
      label: 'Itens',
      icon: 'bi-box-seam-fill',
    },
    {
      id: 'transport' as const,
      label: 'Transporte',
      icon: 'bi-truck',
    },
    {
      id: 'payment' as const,
      label: 'Pagamento',
      icon: 'bi-credit-card-2-front-fill',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Emitir nota fiscal de saída"
      aria-busy={isPreparingInitialData}
      className="fixed inset-0 z-[999999] flex h-full min-h-0 w-full flex-col overflow-hidden overscroll-none bg-white dark:bg-slate-900 animate-in fade-in duration-150"
    >
      {/* Cabeçalho Compacto (Menor Espaçamento Vertical) */}
      <header className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-2">
        <div className="flex min-w-0 w-full items-center justify-start gap-2 sm:flex-1 sm:gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <i className="bi bi-receipt-cutoff text-sm" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 leading-tight truncate">
                Emitir nota fiscal de saída
              </h3>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 truncate">
                Pedido #{order.orderIndex || order.id} • {modelLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider select-none ${
              environment === 2
                ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {environment === 2 ? 'Homologação' : 'Produção'}
          </span>
          <button
            type="button"
            aria-label="Fechar emissão fiscal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>
      </header>

      {/* Barra de Abas (Tabs) Embaixo do Cabeçalho - Minimalista: Apenas Ícone e Nome */}
      <div
        role="tablist"
        aria-label="Abas da emissão fiscal"
        className="flex shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 custom-scrollbar sm:gap-2 sm:px-6"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold whitespace-nowrap outline-none transition-all ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-300 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <i className={`bi ${tab.icon} text-sm`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Abas (Painéis Full Screen com scroll) */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/50 p-4 dark:bg-slate-950/20 custom-scrollbar sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Card de Sucesso da Emissão (Exibido no topo se já emitido) */}
          {emissionResult?.success && (
            <NfeSuccessCard result={emissionResult} onPrintDanfe={handlePrintDanfe} />
          )}

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
              onProductionConfirmedChange={setProductionConfirmed}
              order={order}
              finalConsumer={finalConsumer}
              onFinalConsumerChange={setFinalConsumer}
              modelLabel={modelLabel}
              modelReason={modelDecision?.reason}
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
              fiscalPreparationError={fiscalPreparationError}
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

      {/* Rodapé Compacto (Footer) */}
      <footer className="px-3 py-2 sm:px-6 sm:py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total da Nota:{' '}
            <strong className="text-sm font-black text-slate-800 dark:text-slate-100">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                invoiceTotal
              )}
            </strong>
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>

          {!emissionResult?.success && !emissionResult?.pending ? (
            (() => {
              if (
                emissionResult?.numberConflict ||
                emissionResult?.hmlConfirmedNotFound ||
                emissionResult?.hmlNewEmissionRequired
              )
                return null;
              return (
                <>
                  {!canOperateFiscal && (
                    <p className="text-xs font-semibold text-rose-600" role="alert">
                      Seu perfil não pode operar documentos fiscais.
                    </p>
                  )}
                  <button
                    type="button"
                    data-testid="nfe-emit-button"
                    onClick={() => handleEmit(productionConfirmed, false)}
                    disabled={
                      !canOperateFiscal ||
                      isSubmitting ||
                      isLoadingFiscalData ||
                      isLoadingNfeNumber ||
                      isLoadingCustomerType ||
                      Boolean(fiscalPreparationError)
                    }
                    className="px-5 py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>
                          Transmitindo {environment === 1 ? 'em Produção' : 'em Homologação'}...
                        </span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-arrow-up-fill" />
                        <span>
                          {emissionResult &&
                          getFiscalIssuePresentation(emissionResult).action === 'retry-safely'
                            ? 'Tentar novamente'
                            : `Emitir ${isNfce ? 'NFC-e' : 'NF-e'} em ${environment === 1 ? 'Produção' : 'Homologação'}`}
                        </span>
                      </>
                    )}
                  </button>
                </>
              );
            })()
          ) : emissionResult?.pending ? null : (
            <button
              type="button"
              onClick={handlePrintDanfe}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              <i className="bi bi-printer-fill" />
              <span>Imprimir DANFE</span>
            </button>
          )}
        </div>
      </footer>

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
