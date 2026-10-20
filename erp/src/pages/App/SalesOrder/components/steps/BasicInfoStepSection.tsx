import React from 'react';
import SectionCard from '@/components/SectionCard';
import FormHeader from '../FormHeader';
import SellerInput from '../SellerInput';
import { useSalesOrderForm } from '../../hooks/useSalesOrderForm';

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
