import React from 'react';
import SectionCard from '@/components/SectionCard';
import NoticeInput from '@/components/NoticeInput';
import FormHeader from '../FormHeader';
import SellerInput from '../SellerInput';
import ShippingInputs from '../ShippingData';
import PaymentsTable from '../../PaymentsTable/Index';
import { useSalesOrderForm } from '../../hooks/useSalesOrderForm';
import PickupIcon from '@/components/shared/PickupIcon';
import DeliveryTruckIcon from '@/components/shared/DeliveryTruckIcon';
import { joinNoticeTags, splitNoticeTags } from '@/pages/utils/noticeTags';
import { requiresAssemblyResponsible } from '../../../../../../../shared-utils/commercialOrderRules';

const CALL_BEFORE_DELIVERY_NOTICE = 'Ligar antes da entrega';
const BRING_CARD_MACHINE_NOTICE = 'Levar máquina de cartão';
const CALL_ON_ARRIVAL_NOTICE = 'Ligar ao chegar';
const DELIVERY_NOTICE_OPTIONS = [
  {
    field: 'callBeforeDelivery',
    label: `${CALL_BEFORE_DELIVERY_NOTICE}?`,
    notice: CALL_BEFORE_DELIVERY_NOTICE,
  },
  {
    field: 'bringCardMachine',
    label: `${BRING_CARD_MACHINE_NOTICE}?`,
    notice: BRING_CARD_MACHINE_NOTICE,
  },
  { field: 'callOnArrival', label: `${CALL_ON_ARRIVAL_NOTICE}?`, notice: CALL_ON_ARRIVAL_NOTICE },
] as const;
const normalizeNotice = (notice: string) => notice.trim().toLocaleLowerCase('pt-BR');
const ASSEMBLY_RESPONSIBLE_NOTICES = {
  'Nossa equipe': 'Montagem na entrega - pela nossa equipe',
  'Montador terceirizado': 'Montagem na entrega - por montador terceirizado',
} as const;
const hasPendingCardOnDelivery = (
  orderType: string,
  deliveryMethod: string,
  payments: Array<{ method?: string; status?: string }>
) =>
  orderType === 'sale' &&
  deliveryMethod === 'delivery' &&
  payments.some(
    ({ method, status }) =>
      status === 'Pendente' &&
      (method === 'Cartão de Débito' || Boolean(method?.startsWith('Cartão de Crédito')))
  );

type FormInstance = ReturnType<typeof useSalesOrderForm>;

export const BasicInfoStepSection = ({
  form,
  isBudget,
  onLoadJSON,
  onOpenSellerSearch,
}: {
  form: FormInstance;
  isBudget: boolean;
  onLoadJSON?: (data: any) => void | boolean | Promise<void | boolean>;
  onOpenSellerSearch?: () => void;
}) => {
  const { state, actions } = form;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      <FormHeader
        currentOrder={state.currentOrder}
        onClearForm={actions.clearForm}
        orderDate={state.orderDate}
        setOrderDate={actions.setOrderDate}
        seller={state.seller}
        setSeller={actions.setSeller}
        isSavingDraft={state.isSavingDraft}
        errors={state.errors}
        deliveryMethod={state.shipping.deliveryMethod}
        setDeliveryMethod={actions.setDeliveryMethod}
        status={state.status}
        isSaving={state.isSaving}
        onMainAction={
          state.status === 'draft' ? actions.handleCompleteOrder : actions.handleSaveOrder
        }
        currentOrderId={state.currentOrderId}
        isBudget={isBudget}
        onLoadJSON={onLoadJSON}
      />

      <SectionCard
        icon="bi bi-info-circle"
        iconBg="bg-blue-600 shadow-blue-100 dark:shadow-blue-900/20"
        title="Informações básicas"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SellerInput
            value={state.seller}
            sellerId={state.sellerId}
            onChange={actions.setSeller}
            onSelectSeller={(sellerData) => {
              if (actions.setSellerData) {
                actions.setSellerData(sellerData);
              } else {
                actions.setSeller(sellerData.name);
              }
            }}
            onAddNewSeller={onOpenSellerSearch}
          />

          <div className="flex flex-col relative w-full group">
            <div className="flex items-center justify-between mb-2 ml-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <i className="bi bi-calendar-event text-blue-500 text-xs" />
                Data do Pedido <span className="text-red-500">*</span>
              </label>
            </div>

            <input
              type="datetime-local"
              value={state.orderDate}
              onChange={(e) => actions.setOrderDate(e.target.value)}
              className="w-full border-b-2 border-slate-200 bg-transparent px-3 py-3 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-blue-600 dark:border-slate-700 dark:text-slate-100 dark:focus:border-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export const LogisticsStepSection = ({
  form,
  isBudget,
  isPickup,
}: {
  form: FormInstance;
  isBudget: boolean;
  isPickup: boolean;
}) => {
  const { state, actions } = form;
  const cardMachineRequired = hasPendingCardOnDelivery(
    state.currentOrder.orderType,
    state.shipping.deliveryMethod,
    state.payments
  );
  const isSaleDelivery =
    !isBudget &&
    state.currentOrder.orderType === 'sale' &&
    !isPickup &&
    state.shipping.deliveryMethod === 'delivery';
  React.useEffect(() => {
    let notices = splitNoticeTags(state.observation);
    let noticesChanged = false;

    for (const option of DELIVERY_NOTICE_OPTIONS) {
      const shouldShowNotice = isSaleDelivery && state.shipping[option.field] === true;
      const hasNotice = notices.some(
        (notice) => normalizeNotice(notice) === normalizeNotice(option.notice)
      );

      if (shouldShowNotice && !hasNotice) {
        notices = [...notices, option.notice];
        noticesChanged = true;
      } else if (!shouldShowNotice && hasNotice) {
        notices = notices.filter(
          (notice) => normalizeNotice(notice) !== normalizeNotice(option.notice)
        );
        noticesChanged = true;
      }
    }

    const assemblyNotices = new Set(
      isSaleDelivery
        ? state.items.flatMap((item) => {
            if (!requiresAssemblyResponsible(item.handlingType, state.shipping.deliveryMethod)) {
              return [];
            }
            if (item.assemblyResponsible === 'Nossa equipe') {
              return [ASSEMBLY_RESPONSIBLE_NOTICES['Nossa equipe']];
            }
            if (item.assemblyResponsible === 'Montador terceirizado') {
              return [ASSEMBLY_RESPONSIBLE_NOTICES['Montador terceirizado']];
            }
            return [];
          })
        : []
    );

    for (const managedNotice of Object.values(ASSEMBLY_RESPONSIBLE_NOTICES)) {
      const noticeIndex = notices.findIndex(
        (notice) => normalizeNotice(notice) === normalizeNotice(managedNotice)
      );
      const shouldShowNotice = assemblyNotices.has(managedNotice);

      if (shouldShowNotice && noticeIndex === -1) {
        notices = [...notices, managedNotice];
        noticesChanged = true;
      } else if (shouldShowNotice && notices[noticeIndex] !== managedNotice) {
        notices[noticeIndex] = managedNotice;
        noticesChanged = true;
      } else if (!shouldShowNotice && noticeIndex !== -1) {
        notices = notices.filter(
          (notice) => normalizeNotice(notice) !== normalizeNotice(managedNotice)
        );
        noticesChanged = true;
      }
    }

    if (
      !isSaleDelivery &&
      (state.shipping.callBeforeDelivery !== undefined ||
        state.shipping.bringCardMachine !== undefined ||
        state.shipping.callOnArrival !== undefined)
    ) {
      actions.setShipping((previous) => ({
        ...previous,
        callBeforeDelivery: undefined,
        bringCardMachine: undefined,
        callOnArrival: undefined,
      }));
    }
    if (noticesChanged) actions.setObservation(joinNoticeTags(notices));
  }, [
    actions.setObservation,
    actions.setShipping,
    isSaleDelivery,
    state.items,
    state.observation,
    state.shipping.deliveryMethod,
    state.shipping.callBeforeDelivery,
    state.shipping.bringCardMachine,
    state.shipping.callOnArrival,
  ]);

  const setDeliveryFlag = (
    field: (typeof DELIVERY_NOTICE_OPTIONS)[number]['field'],
    noticeLabel: string,
    value: boolean
  ) => {
    actions.setShipping((previous) => ({ ...previous, [field]: value }));
    const notices = splitNoticeTags(state.observation).filter(
              (notice) => normalizeNotice(notice) !== normalizeNotice(noticeLabel)
    );
    actions.setObservation(joinNoticeTags(value ? [...notices, noticeLabel] : notices));
  };

  const setDeliveryNotices = (value: string) => {
    let notices = splitNoticeTags(value);
    for (const option of DELIVERY_NOTICE_OPTIONS) {
      const hasNotice = notices.some(
        (notice) => normalizeNotice(notice) === normalizeNotice(option.notice)
      );
      if (isSaleDelivery && state.shipping[option.field] === true && !hasNotice) {
        notices = [...notices, option.notice];
      }
    }
    actions.setObservation(joinNoticeTags(notices));
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <SectionCard
        icon={isPickup ? <PickupIcon white className="h-6 w-6" /> : <DeliveryTruckIcon className="h-6 w-6 text-white" />}
        iconBg={
          isPickup
            ? 'bg-purple-600 shadow-purple-100 dark:shadow-purple-900/20'
            : 'bg-orange-500 shadow-orange-100 dark:shadow-orange-900/20'
        }
        title={isBudget ? 'Frete e Entrega' : 'Logística'}
        className="bg-white dark:bg-slate-900 transition-colors duration-300"
      >
        <ShippingInputs
          shipping={state.shipping}
          setShipping={actions.setShipping}
          customerData={state.customerData}
          isCalculatingDistance={state.isCalculatingDistance}
          onAutoCalculateDistance={() => {
            const targetAddr =
              state.shipping.useCustomerAddress === false && state.shipping.deliveryAddress
                ? state.shipping.deliveryAddress
                : state.customerData.fullAddress;
            actions.handleAutoCalculateDistance(targetAddr);
          }}
          errors={state.errors}
          orderType={state.currentOrder.orderType}
          schedulingSessionRef={state.schedulingSessionRef}
        />
      </SectionCard>

      <SectionCard
        icon="bi bi-info-circle-fill"
        iconBg="bg-amber-600 shadow-amber-100 dark:shadow-amber-900/20"
        title={
          isBudget
            ? 'Avisos sobre o Orçamento'
            : isPickup
              ? 'Avisos sobre a Retirada'
              : 'Avisos sobre a Entrega'
        }
        className="bg-white dark:bg-slate-900"
      >
        {isSaleDelivery && (
          <div className="mb-4 flex flex-wrap items-start gap-x-8 gap-y-3">
            {DELIVERY_NOTICE_OPTIONS.map((option) => {
              const error = state.errors[`shipping_${option.field}`];
              const labelId = `delivery-option-${option.field}-label`;
              const errorId = `delivery-option-${option.field}-error`;
              const isCardMachineLocked = option.field === 'bringCardMachine' && cardMachineRequired;
              const selectedValue = isCardMachineLocked ? true : state.shipping[option.field];

              return (
                <div key={option.field} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span
                      id={labelId}
                      title={
                        isCardMachineLocked
                          ? 'Sim obrigatório: há um pagamento pendente no cartão de débito/crédito para pagar na entrega.'
                          : undefined
                      }
                      className="text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      {option.label} <span className="text-red-500">*</span>
                    </span>
                    <div
                      role="radiogroup"
                      aria-labelledby={labelId}
                      aria-describedby={error ? errorId : undefined}
                      aria-invalid={Boolean(error)}
                      className="flex items-center gap-3"
                    >
                      {([true, false] as const).map((value) => (
                        <label
                          key={String(value)}
                          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"
                        >
                          <input
                            type="radio"
                            name={option.field}
                            value={String(value)}
                            checked={selectedValue === value}
                            disabled={isCardMachineLocked}
                            required={selectedValue === undefined}
                            onChange={() => setDeliveryFlag(option.field, option.notice, value)}
                            className="h-4 w-4 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          {value ? 'Sim' : 'Não'}
                        </label>
                      ))}
                    </div>
                  </div>
                  {error && (
                    <p id={errorId} role="alert" className="mt-1 text-xs font-bold text-red-600">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <NoticeInput
          value={state.observation}
          onChange={setDeliveryNotices}
          placeholder={
            isBudget
              ? 'Observações gerais da proposta...'
              : isPickup
                ? 'Instruções específicas para a retirada...'
                : 'Instruções específicas para a entrega/montagem...'
          }
        />
      </SectionCard>
    </div>
  );
};

export const PaymentsStepSection = ({
  form,
  isBudget,
}: {
  form: FormInstance;
  isBudget: boolean;
}) => {
  const { state, actions } = form;
  const cardMachineRequired = hasPendingCardOnDelivery(
    state.currentOrder.orderType,
    state.shipping.deliveryMethod,
    state.payments
  );
  React.useEffect(() => {
    if (!cardMachineRequired) return;
    if (state.shipping.bringCardMachine !== true) {
      actions.setShipping((previous) => ({ ...previous, bringCardMachine: true }));
    }
    const notices = splitNoticeTags(state.observation);
    if (!notices.some((notice) => normalizeNotice(notice) === normalizeNotice(BRING_CARD_MACHINE_NOTICE))) {
      actions.setObservation(joinNoticeTags([...notices, BRING_CARD_MACHINE_NOTICE]));
    }
  }, [
    actions.setObservation,
    actions.setShipping,
    cardMachineRequired,
    state.observation,
    state.shipping.bringCardMachine,
  ]);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <SectionCard
        icon={isBudget ? 'bi bi-calculator' : 'bi bi-credit-card-2-front'}
        iconBg="bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/20"
        title="Pagamentos"
        action={
          <button
            type="button"
            onClick={() =>
              actions.setPayments((payments) => [
                ...payments,
                {
                  method: '',
                  amount: 0,
                  fee: 0,
                  feeType: 'fixed',
                  status: '',
                },
              ])
            }
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:bg-indigo-700 active:scale-95"
          >
            <i className="bi bi-plus-lg" />
            <span className="hidden sm:inline">Adicionar pagamento</span>
          </button>
        }
      >
        <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
          {isBudget && state.payments.length === 0 && (
            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 text-center">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Apenas orçamento de valores?
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Você pode pular esta etapa se não precisar definir as formas de pagamento agora.
                </p>
              </div>
              <button
                type="button"
                onClick={actions.goToNextStep}
                className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-200 transition-all flex items-center gap-3 shadow-sm hover:shadow-md active:scale-95"
              >
                <i className="bi bi-fast-forward-fill text-sm" /> Não Informar Pagamento / Ir para
                Resumo
              </button>
            </div>
          )}
          <PaymentsTable
            payments={state.payments}
            setPayments={actions.setPayments}
            summary={state.paymentsSummary}
            errors={state.errors}
            deliveryMethod={state.shipping.deliveryMethod}
          />
        </div>
      </SectionCard>
    </div>
  );
};
