import React from 'react';
import SectionCard from '@/components/SectionCard';
import NoticeInput from '@/components/NoticeInput';
import FormHeader from '../FormHeader';
import SellerInput from '../SellerInput';
import ShippingInputs from '../ShippingData';
import PaymentsTable from '../../PaymentsTable/Index';
import { useSalesOrderForm } from '../../hooks/useSalesOrderForm';

type FormInstance = ReturnType<typeof useSalesOrderForm>;

export const BasicInfoStepSection = ({
  form,
  isBudget,
  onLoadJSON,
  onOpenSellerSearch,
}: {
  form: FormInstance;
  isBudget: boolean;
  onLoadJSON?: (data: any) => void;
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
        setDeliveryMethod={(method) =>
          actions.setShipping((prev) => ({ ...prev, deliveryMethod: method }))
        }
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
                Data do Pedido
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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <SectionCard
        icon={isPickup ? 'bi bi-shop' : 'bi bi-truck'}
        iconBg={
          isPickup
            ? 'bg-emerald-500 shadow-emerald-100 dark:shadow-emerald-900/20'
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
        <NoticeInput
          value={state.observation}
          onChange={(val) => actions.setObservation(val)}
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
          />
        </div>
      </SectionCard>
    </div>
  );
};
