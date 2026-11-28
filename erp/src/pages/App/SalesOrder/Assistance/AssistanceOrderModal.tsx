import React from 'react';
import Seller from '@/pages/App/SalesOrder/components/customer/Seller';
import Agendamento from '@/pages/App/SalesOrder/ShippingComponents/Agendamento';
import CustomerSearchModal from '@/pages/App/SalesOrder/modals/CustomerSearchModal';
import { formatOrderCode } from '@/pages/utils/orderCode';
import OrderStepper from '../components/stepper/OrderStepper';
import type { OrderStep, OrderStepStatus } from '../components/stepper/orderStepperConfig';

import {
  AssistanceOrderHeader,
  AssistanceLinkedOrderSection,
  AssistanceCustomerSection,
  AssistanceDescriptionSection,
  AssistanceActions,
} from './components';

import { useAssistanceOrderForm } from './hooks/useAssistanceOrderForm';
import type { AssistanceOrderModalProps } from './types/assistance.types';

const ASSISTANCE_STEPS: OrderStep[] = [
  { step: 1, icon: 'bi-person-badge', label: 'Cliente' },
  { step: 2, icon: 'bi-tools', label: 'Serviço' },
  { step: 3, icon: 'bi-calendar-check', label: 'Agendamento' },
];

const ASSISTANCE_STEP_ERROR_PREFIXES: Record<number, string[]> = {
  1: ['customer', 'customerData', 'assistanceItems', 'linkedOrder'],
  2: ['seller', 'assistanceDescription', 'observation', 'assistanceCost', 'assistanceServiceValue'],
  3: ['shipping', 'scheduled', 'scheduling', 'deliveryDate', 'deliveryTime'],
};

const resolveAssistanceStepStatus = (
  step: number,
  currentStep: number,
  errors: Record<string, string>
): OrderStepStatus => {
  const prefixes = ASSISTANCE_STEP_ERROR_PREFIXES[step] || [];
  const hasError = Object.keys(errors).some((key) =>
    prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}_`) || key.startsWith(`${prefix}.`))
  );
  if (hasError) return 'error';
  if (step === currentStep) return 'active';
  return step < currentStep ? 'done' : 'pending';
};

const AssistanceOrderContent: React.FC<AssistanceOrderModalProps> = (props) => {
  const {
    isEditing,
    loading,
    autoSaving,
    operationError,
    saveBlocked,
    hasSavedFinal,
    linkedOrderLoading,
    linkedOrderError,
    retryLinkedOrder,
    handleClose,
    customerData,
    setCustomerData,
    seller,
    setSeller,
    description,
    setDescription,
    observation,
    setObservation,
    assistanceServiceValue,
    setAssistanceServiceValue,
    assistanceCost,
    setAssistanceCost,
    scheduling,
    handleChangeScheduling,
    isLinked,
    currentLinkedOrder,
    selectedAssistanceItems,
    handleToggleItem,
    handleUpdateItemQty,
    validationErrors,
    handleSave,
    isCustomerSearchOpen,
    setIsCustomerSearchOpen,
  } = useAssistanceOrderForm(props);

  const [currentStep, setCurrentStep] = React.useState(1);
  const contentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [currentStep]);

  const jumpToStep = (step: number) => {
    setCurrentStep(Math.min(Math.max(step, 1), ASSISTANCE_STEPS.length));
  };
  const goToPreviousStep = () => jumpToStep(currentStep - 1);
  const goToNextStep = () => jumpToStep(currentStep + 1);
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentStep === ASSISTANCE_STEPS.length) void handleSave(event);
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[3px] animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Formulário de assistência"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t sm:border border-slate-100 dark:border-slate-800"
        style={{ height: '90vh', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <AssistanceOrderHeader
          isEditing={isEditing}
          isLinked={isLinked}
          linkedOrderCode={currentLinkedOrder ? formatOrderCode(currentLinkedOrder) : undefined}
          onClose={handleClose}
          autoSaving={autoSaving}
          isBusy={loading || autoSaving}
        />

        <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <OrderStepper
            currentStep={currentStep}
            jumpToStep={jumpToStep}
            errors={validationErrors}
            steps={ASSISTANCE_STEPS}
            resolveStepStatus={resolveAssistanceStepStatus}
            navigationLabel="Navegação entre etapas da assistência"
            navigationDisabled={loading}
          />
        </div>

        <form
          noValidate
          onSubmit={handleFormSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div ref={contentRef} className="flex-1 overflow-y-auto p-5 custom-scrollbar sm:p-8">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {operationError && (
                <div
                  role="alert"
                  className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-900 animate-fade-in dark:text-amber-200"
                >
                  <i className="bi bi-exclamation-triangle-fill shrink-0 text-base text-amber-500" />
                  <span>{operationError}</span>
                </div>
              )}
              {linkedOrderError && (
                <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
                  {linkedOrderError}{' '}
                  <button type="button" onClick={retryLinkedOrder} disabled={loading} className="underline">
                    Consultar venda novamente
                  </button>
                </p>
              )}
              {(loading || autoSaving || linkedOrderLoading) && (
                <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
                  <i className="bi bi-arrow-repeat mr-2 animate-spin" />
                  {loading ? 'Confirmando salvamento da assistência...' : autoSaving ? 'Salvando rascunho da assistência...' : 'Consultando a venda vinculada...'}
                </p>
              )}

              <fieldset disabled={loading || saveBlocked || hasSavedFinal} className="contents">
                {currentStep === 1 && (
                  <>
                    {isLinked && currentLinkedOrder && (
                      <AssistanceLinkedOrderSection
                        currentLinkedOrder={currentLinkedOrder}
                        selectedAssistanceItems={selectedAssistanceItems}
                        handleToggleItem={handleToggleItem}
                        handleUpdateItemQty={handleUpdateItemQty}
                      />
                    )}
                    <AssistanceCustomerSection
                      customerData={customerData}
                      setCustomerData={setCustomerData}
                      onOpenSearch={() => setIsCustomerSearchOpen(true)}
                      errors={validationErrors}
                      isLinked={isLinked}
                    />
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="flex flex-col gap-4">
                      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        <i className="bi bi-person-badge-fill text-amber-500" />
                        Atendente Principal
                      </h3>
                      <Seller seller={seller} setSeller={setSeller} errors={validationErrors} />
                    </div>
                    <AssistanceDescriptionSection
                      description={description}
                      setDescription={setDescription}
                      observation={observation}
                      setObservation={setObservation}
                      assistanceServiceValue={assistanceServiceValue}
                      setAssistanceServiceValue={setAssistanceServiceValue}
                      assistanceCost={assistanceCost}
                      setAssistanceCost={setAssistanceCost}
                      errors={validationErrors}
                    />
                  </>
                )}

                {currentStep === 3 && (
                  <div className="flex flex-col gap-4">
                    <Agendamento
                      title="Agendamento da Assistência"
                      scheduling={scheduling}
                      onChangeScheduling={handleChangeScheduling}
                      errors={validationErrors}
                      isPickup={false}
                      operationNoun="assistência"
                      hideNotice={true}
                    />
                  </div>
                )}
              </fieldset>
            </div>
          </div>

          <AssistanceActions
            onClose={handleClose}
            isLoading={loading}
            currentStep={currentStep}
            totalSteps={ASSISTANCE_STEPS.length}
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
            navigationDisabled={loading}
            saveBlocked={saveBlocked || linkedOrderLoading}
            autoSaving={autoSaving}
          />
        </form>
      </div>

      {isCustomerSearchOpen && !loading && !saveBlocked && !hasSavedFinal && (
        <CustomerSearchModal
          onClose={() => setIsCustomerSearchOpen(false)}
          onSelect={(c) => {
            setCustomerData(c);
            setIsCustomerSearchOpen(false);
          }}
        />
      )}
    </div>
  );
};

const AssistanceOrderModal: React.FC<AssistanceOrderModalProps> = (props) => (
  <AssistanceOrderContent key={JSON.stringify([props.order, props.sourceOrder, props.initialData])} {...props} />
);

export default AssistanceOrderModal;
