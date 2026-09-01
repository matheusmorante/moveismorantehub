import React from "react";
import ItemsTable from "./ItemsTable";
import ShippingInputs from "./ShippingData";
import PaymentsTable from "./PaymentsTable/Index";
import PersonalInfos from "./CustomerData";
import FormHeader from "./FormHeader";
import FormFooter from "./FormFooter";
import SectionCard from "../../../components/SectionCard";
import { useSalesOrderForm } from "./useSalesOrderForm";
import NoticeInput from "../../../components/NoticeInput";


import { getSettings } from "../../../pages/utils/settingsService";

import SellerInput from "./components/SellerInput";

type SalesOrderFormSectionProps = {
    form: ReturnType<typeof useSalesOrderForm>;
    scrollRef?: React.RefObject<HTMLDivElement>;
    onLoadJSON?: (data: any) => void;
    onOpenSellerSearch?: () => void;
    sellerRef?: React.RefObject<HTMLButtonElement>;
    /** Se true, destaca visualmente os itens sem produto vinculado (temporários) */
    highlightTemporaryItems?: boolean;
};

const SalesOrderFormSection = ({ form, scrollRef, onLoadJSON, onOpenSellerSearch, sellerRef, highlightTemporaryItems }: SalesOrderFormSectionProps) => {
    const { state, actions } = form;
    const isPickup = state.shipping.deliveryMethod === 'pickup';
    const { currentStep } = state;
    const isBudget = state.currentOrder.orderType === 'budget';
    
    // Resolve all handling options
    const settings = getSettings();
    const allOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    return (
        <form
            className="flex flex-col w-full h-full bg-white dark:bg-slate-900 relative transition-colors duration-300 overflow-hidden"
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
        >
            {/* Scrollable Body */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-8 pt-0 custom-scrollbar"
            >
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
                    setDeliveryMethod={(method) => actions.setShipping(prev => ({ ...prev, deliveryMethod: method }))}
                    status={state.status}
                    isSaving={state.isSaving}
                    onMainAction={state.status === 'draft' ? actions.handleCompleteOrder : actions.handleSaveOrder}
                    currentOrderId={state.currentOrderId}
                    isBudget={isBudget}
                    onLoadJSON={onLoadJSON}
                />

                {/* Wizard Steps Content */}
                <div className="max-w-[1400px] mx-auto pb-10">
                    {currentStep === 1 && (
                        <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
                            <SectionCard
                                icon="bi bi-info-circle"
                                iconBg="bg-blue-600 shadow-blue-100 dark:shadow-blue-900/20"
                                title="Informações básicas"
                                subtitle="Defina o vendedor e a data do pedido"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SellerInput
                                        value={state.seller}
                                        onChange={actions.setSeller}
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
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 px-4 py-3 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="flex flex-col gap-8 animate-fade-in">
                            <SectionCard
                                icon="bi bi-box-seam"
                                iconBg="bg-blue-600 shadow-blue-100 dark:shadow-blue-900/20"
                                title="Itens do Pedido"
                                action={
                                    <button
                                        type="button"
                                        onClick={() => {
                                            actions.setItems((prev) => [
                                                ...prev,
                                                {
                                                    description: '',
                                                    quantity: 1,
                                                    unitPrice: 0,
                                                    unitDiscount: 0,
                                                    discountType: 'fixed',
                                                    handlingType: ''
                                                }
                                            ]);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                                    >
                                        <i className="bi bi-plus-lg text-xs" />
                                        <span>Adicionar Item</span>
                                    </button>
                                }
                            >
                                <ItemsTable
                                    items={state.items}
                                    setItems={actions.setItems}
                                    summary={state.itemsSummary}
                                    deliveryMethod={state.shipping.deliveryMethod}
                                    errors={state.errors}
                                    onSelectProduct={actions.handleSelectProduct}
                                    isBudget={isBudget}
                                    highlightTemporaryItems={highlightTemporaryItems}
                                />
                            </SectionCard>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
                            <SectionCard
                                icon="bi bi-person-badge"
                                iconBg="bg-purple-600 shadow-purple-100 dark:shadow-purple-900/20"
                                title="Dados do Cliente"
                                subtitle="Informações para faturamento e contato"
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
                                />
                            </SectionCard>

                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
                            <SectionCard
                                icon={isPickup ? "bi bi-hand-index-thumb" : "bi bi-truck"}
                                iconBg={isPickup ? "bg-emerald-500 shadow-emerald-100 dark:shadow-emerald-900/20" : "bg-orange-500 shadow-orange-100 dark:shadow-orange-900/20"}
                                title={isBudget ? "Frete e Entrega" : "Logística"}
                                subtitle={isBudget ? "Cálculo de valores para entrega" : "Defina como o produto chegará ao cliente"}
                                className="bg-white dark:bg-slate-900 transition-colors duration-300"
                            >
                                <ShippingInputs
                                    shipping={state.shipping}
                                    setShipping={actions.setShipping}
                                    customerData={state.customerData}
                                    isCalculatingDistance={state.isCalculatingDistance}
                                    onAutoCalculateDistance={() => actions.handleAutoCalculateDistance(state.customerData.fullAddress)}
                                    errors={state.errors}
                                    orderType={state.currentOrder.orderType}
                                />
                            </SectionCard>

                            <SectionCard
                                icon="bi bi-info-circle-fill"
                                iconBg="bg-amber-600 shadow-amber-100 dark:shadow-amber-900/20"
                                title={isBudget ? "Avisos sobre o Orçamento" : (isPickup ? "Avisos sobre a Retirada" : "Avisos sobre a Entrega")}
                                className="bg-white dark:bg-slate-900"
                            >
                                <NoticeInput
                                    value={state.observation}
                                    onChange={(val) => actions.setObservation(val)}
                                    placeholder={isBudget ? "Observações gerais da proposta..." : (isPickup ? "Instruções específicas para a retirada..." : "Instruções específicas para a entrega/montagem...")}
                                />
                            </SectionCard>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="max-w-5xl mx-auto animate-fade-in">
                            <SectionCard
                                icon={isBudget ? "bi bi-calculator" : "bi bi-credit-card-2-front"}
                                iconBg="bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/20"
                                title="Condição de Pagamento"
                                subtitle={isBudget ? "Preenchimento opcional para propostas" : "Formas e prazos acordados"}
                            >
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm transition-colors duration-300">
                                    {isBudget && state.payments.length === 0 && (
                                        <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 text-center">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Apenas orçamento de valores?</p>
                                                <p className="text-[11px] text-slate-400 font-medium">Você pode pular esta etapa se não precisar definir as formas de pagamento agora.</p>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={actions.goToNextStep}
                                                className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-200 transition-all flex items-center gap-3 shadow-sm hover:shadow-md active:scale-95"
                                            >
                                                <i className="bi bi-fast-forward-fill text-sm" /> Não Informar Pagamento / Ir para Resumo
                                            </button>
                                        </div>
                                    )}
                                    <PaymentsTable
                                        payments={state.payments}
                                        setPayments={actions.setPayments}
                                        summary={state.paymentsSummary}
                                    />
                                </div>
                            </SectionCard>
                        </div>
                    )}

                </div>
            </div>

            <FormFooter
                currentOrder={state.currentOrder}
                totalOrderValue={state.paymentsSummary.totalOrderValue}
                isSaving={state.isSaving}
                isSavingDraft={state.isSavingDraft}
                onCompleteOrder={state.status === 'draft' ? actions.handleCompleteOrder : actions.handleSaveOrder}
                onPrev={actions.goToPrevStep}
                onNext={actions.goToNextStep}
                currentStep={currentStep}
                buttonLabel={isBudget ? "Salvar Orçamento" : (state.status === 'draft' ? "Finalizar Cadastro" : "Salvar Edição")}
                colorScheme={isBudget ? "indigo" : (state.status === 'draft' ? "emerald" : "blue")}
            />
            
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }` }} />
        </form>
    );
};

export default SalesOrderFormSection;
