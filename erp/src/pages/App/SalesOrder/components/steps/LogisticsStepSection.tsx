import React from 'react';
import SectionCard from '@/components/SectionCard';
import NoticeInput from '@/components/NoticeInput';
import ShippingInputs from '../ShippingData';
import PickupIcon from '@/components/shared/PickupIcon';
import DeliveryTruckIcon from '@/components/shared/DeliveryTruckIcon';
import { joinNoticeTags, splitNoticeTags } from '@/pages/utils/noticeTags';
import { useSalesOrderForm } from '../../hooks/useSalesOrderForm';
import {
  DELIVERY_NOTICE_OPTIONS,
  hasPendingCardOnDelivery,
  normalizeNotice,
  syncDeliveryAndAssemblyNotices,
} from './logisticsNoticeRules';

type FormInstance = ReturnType<typeof useSalesOrderForm>;

interface LogisticsStepSectionProps {
  form: FormInstance;
  isBudget: boolean;
  isPickup: boolean;
}

export const LogisticsStepSection: React.FC<LogisticsStepSectionProps> = ({
  form,
  isBudget,
  isPickup,
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
    const { nextObservation, changed } = syncDeliveryAndAssemblyNotices({
      rawObservation: state.observation,
      isSaleDelivery,
      shipping: state.shipping,
      items: state.items,
    });

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
    if (changed) actions.setObservation(nextObservation);
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
