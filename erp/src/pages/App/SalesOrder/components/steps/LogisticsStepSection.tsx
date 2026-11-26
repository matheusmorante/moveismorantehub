import React from 'react';
import SectionCard from '@/components/display/SectionCard';
import NoticeInput from '@/components/inputs/NoticeInput';
import ShippingInputs from '../shipping/ShippingData';
import DeliveryTruckIcon from '@/components/shared/DeliveryTruckIcon';
import { useSalesOrderForm } from '../../hooks/form-flow/useSalesOrderForm';
import {
  hasPendingCardOnDelivery,
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
    state.currentOrder.orderType || '',
    'delivery',
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

    if (changed) actions.setObservation(nextObservation);
  }, [
    actions.setObservation,
    isSaleDelivery,
    state.items,
    state.observation,
    state.shipping.deliveryMethod,
    state.shipping.scheduling.appointments,
  ]);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <SectionCard
        icon={<DeliveryTruckIcon className="h-6 w-6 text-white" />}
        iconBg="bg-orange-500 shadow-orange-100 dark:shadow-orange-900/20"
        title={isBudget ? 'Entrega' : 'Logística'}
        className="bg-white dark:bg-slate-900 transition-colors duration-300"
      >
        <ShippingInputs
          shipping={state.shipping}
          items={state.items}
          setShipping={actions.setShipping}
          customerData={state.customerData}
          isCalculatingDistance={state.isCalculatingDistance}
          onAutoCalculateDistance={(customAddress, options) => {
            const targetAddr = customAddress || (
              state.shipping.useCustomerAddress === false && state.shipping.deliveryAddress
                ? state.shipping.deliveryAddress
                : state.customerData.fullAddress
            );
            return actions.handleAutoCalculateDistance(targetAddr, options);
          }}
          errors={state.errors}
          orderType={state.currentOrder.orderType}
          schedulingSessionRef={state.schedulingSessionRef}
          isNewSale={state.currentOrder.orderType === 'sale' && state.isNewSaleFlow}
          cardMachineRequired={cardMachineRequired}
        />
      </SectionCard>

      {isBudget && (
        <SectionCard
          icon="bi bi-info-circle-fill"
          iconBg="bg-amber-600 shadow-amber-100 dark:shadow-amber-900/20"
          title="Avisos sobre o Orçamento"
          className="bg-white dark:bg-slate-900"
        >
          <NoticeInput
            value={state.observation}
            onChange={actions.setObservation}
            placeholder="Observações gerais da proposta..."
          />
        </SectionCard>
      )}
    </div>
  );
};
