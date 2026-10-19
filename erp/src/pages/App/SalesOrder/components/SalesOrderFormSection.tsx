import React from 'react';
import ItemsTable from '../ItemsTable';
import PersonalInfos from './CustomerData';
import FormFooter from './FormFooter';
import SectionCard from '@/components/SectionCard';
import { useSalesOrderForm } from '../hooks/useSalesOrderForm';
import {
  BasicInfoStepSection,
  LogisticsStepSection,
  PaymentsStepSection,
} from './steps/SalesOrderStepPanels';

type SalesOrderFormSectionProps = {
  form: ReturnType<typeof useSalesOrderForm>;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onLoadJSON?: (data: any) => void | boolean | Promise<void | boolean>;
  onOpenSellerSearch?: () => void;
  sellerRef?: React.RefObject<HTMLButtonElement>;
  /** Se true, destaca visualmente os itens sem produto vinculado (temporários) */
  highlightTemporaryItems?: boolean;
  showTestMode?: boolean;
};

const SalesOrderFormSection = ({
  form,
  scrollRef,
  onLoadJSON,
  onOpenSellerSearch,
  highlightTemporaryItems,
  showTestMode = false,
}: SalesOrderFormSectionProps) => {
  const { state, actions } = form;
  const isPickup = state.shipping.deliveryMethod === 'pickup';
  const { currentStep } = state;
  const isBudget = state.currentOrder.orderType === 'budget';
  const isReturn = state.currentOrder.orderType === 'return';
  const [itemsTab, setItemsTab] = React.useState<'products' | 'services'>('products');

  return (
    <form
      className="flex flex-col w-full h-full bg-white dark:bg-slate-900 relative transition-colors duration-300 overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault();
      }}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 pt-4 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto pb-10">
          {currentStep === 1 && (
            <BasicInfoStepSection
              form={form}
              isBudget={isBudget}
              onLoadJSON={onLoadJSON}
              onOpenSellerSearch={onOpenSellerSearch}
            />
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <SectionCard
                icon="bi bi-box-seam"
                iconBg="bg-blue-600 shadow-blue-100 dark:shadow-blue-900/20"
                title="Itens do Pedido"
                compactHeader
              >
                <ItemsTable
                  items={state.items}
                  setItems={actions.setItems}
                  summary={state.itemsSummary}
                  deliveryMethod={state.shipping.deliveryMethod}
                  errors={state.errors}
                  onSelectProduct={actions.handleSelectProduct}
                  isBudget={isBudget}
                  isReturn={isReturn}
                  highlightTemporaryItems={highlightTemporaryItems}
                  activeTab={itemsTab}
                  onTabChange={setItemsTab}
                />
              </SectionCard>
            </div>
          )}

          {currentStep === 3 && (
            <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
              <SectionCard
                icon="bi bi-person-badge"
                iconBg="bg-purple-600 shadow-purple-100 dark:shadow-purple-900/20"
                title="Cliente"
                className="bg-white dark:bg-slate-900"
              >
                <PersonalInfos
                  customerData={state.customerData}
                  setCustomerData={actions.setCustomerData}
                  errors={state.errors}
                  isPickup={isPickup}
                  marketingOrigin={state.marketingOrigin}
                  setMarketingOrigin={actions.setMarketingOrigin}
                  isBudget={isBudget}
                  isTestMode={state.isTestMode}
                />
              </SectionCard>
            </div>
          )}

          {currentStep === 4 && (
            <LogisticsStepSection form={form} isBudget={isBudget} isPickup={isPickup} />
          )}

          {currentStep === 5 && <PaymentsStepSection form={form} isBudget={isBudget} />}
        </div>
      </div>

      <FormFooter
        currentOrder={state.currentOrder}
        totalOrderValue={state.paymentsSummary.totalOrderValue}
        isSaving={state.isSaving}
        draftAutoSaveStatus={state.draftAutoSaveStatus}
        showDraftAutoSave={state.isDraftAutoSaveEnabled && state.status === 'draft'}
        onCompleteOrder={
          state.status === 'draft' ? actions.handleCompleteOrder : actions.handleSaveOrder
        }
        onPrev={actions.goToPrevStep}
        onNext={actions.goToNextStep}
        currentStep={currentStep}
        buttonLabel={
          isBudget
            ? 'Salvar Orçamento'
            : state.status === 'draft'
              ? 'Finalizar Cadastro'
              : 'Salvar Edição'
        }
        colorScheme={isBudget ? 'indigo' : state.status === 'draft' ? 'emerald' : 'blue'}
        showTestMode={showTestMode}
        isTestMode={state.isTestMode}
        onTestModeChange={actions.setTestMode}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }`,
        }}
      />
    </form>
  );
};

export default SalesOrderFormSection;
