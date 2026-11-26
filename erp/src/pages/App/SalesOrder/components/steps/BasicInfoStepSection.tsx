import React from 'react';
import SectionCard from '@/components/display/SectionCard';
import FormHeader from '../form/FormHeader';
import SellerInput from '../customer/SellerInput';
import { useSalesOrderForm } from '../../hooks/form-flow/useSalesOrderForm';

type FormInstance = ReturnType<typeof useSalesOrderForm>;

interface BasicInfoStepSectionProps {
  form: FormInstance;
  isBudget: boolean;
  onLoadJSON?: (data: any) => void | boolean | Promise<void | boolean>;
  onOpenSellerSearch?: () => void;
}

export const BasicInfoStepSection: React.FC<BasicInfoStepSectionProps> = ({
  form,
  isBudget,
  onLoadJSON,
  onOpenSellerSearch,
}) => {
  const { state, actions } = form;
  const orderDateError = state.errors.order_date || state.errors.date;

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
        hideDeliveryMethod={state.currentOrder.orderType === 'sale'}
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
            error={state.errors.seller}
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
              <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${orderDateError ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                <i className="bi bi-calendar-event text-blue-500 text-xs" />
                Data do Pedido <span className="text-red-500">*</span>
              </label>
            </div>

            <input
              type="datetime-local"
              value={state.orderDate}
              onChange={(e) => actions.setOrderDate(e.target.value)}
              aria-invalid={Boolean(orderDateError)}
              aria-describedby={orderDateError ? 'order-date-error' : undefined}
              className={`w-full border-b-2 bg-transparent px-3 py-3 text-sm font-bold outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark] ${orderDateError ? 'border-red-500 text-red-700 focus:border-red-600 dark:text-red-300 dark:focus:border-red-500' : 'border-slate-200 text-slate-800 focus:border-blue-600 dark:border-slate-700 dark:text-slate-100 dark:focus:border-blue-500'}`}
            />
            {orderDateError && (
              <p id="order-date-error" role="alert" className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">
                {orderDateError}
              </p>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
