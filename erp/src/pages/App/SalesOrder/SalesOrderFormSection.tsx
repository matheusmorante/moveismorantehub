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
import PaymentSimulator from "./PaymentSimulator";

import { getSettings } from "../../../pages/utils/settingsService";

type SalesOrderFormSectionProps = {
    form: ReturnType<typeof useSalesOrderForm>;
    scrollRef?: React.RefObject<HTMLDivElement>;
};

const SalesOrderFormSection = ({ form, scrollRef }: SalesOrderFormSectionProps) => {
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
                />

                {/* Wizard Steps Content */}
                <div className="max-w-[1400px] mx-auto pb-10">
                    {currentStep === 1 && (
                        <div className="flex flex-col gap-8 animate-fade-in">

                            <SectionCard
                                icon="bi bi-box-seam"
                                iconBg="bg-blue-600 shadow-blue-100 dark:shadow-blue-900/20"
                                title="Itens do Pedido"
                                subtitle="Produtos e serviços selecionados"
                            >
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm transition-colors duration-300">
                                    <ItemsTable
                                        items={state.items}
                                        setItems={actions.setItems}
                                        summary={state.itemsSummary}
                                        deliveryMethod={state.shipping.deliveryMethod}
                                        errors={state.errors}
                                        onSelectProduct={actions.handleSelectProduct}
                                    />
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="max-w-4xl mx-auto animate-fade-in">
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
                                />
                            </SectionCard>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
                            <SectionCard
                                icon={isPickup ? "bi bi-hand-index-thumb" : "bi bi-truck"}
                                iconBg={isPickup ? "bg-emerald-500 shadow-emerald-100 dark:shadow-emerald-900/20" : "bg-orange-500 shadow-orange-100 dark:shadow-orange-900/20"}
                                title="Logística"
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
                                title={isPickup ? "Avisos sobre a Retirada" : "Avisos sobre a Entrega"}
                                className="bg-white dark:bg-slate-900"
                            >
                                <NoticeInput
                                    value={state.observation}
                                    onChange={(val) => actions.setObservation(val)}
                                    placeholder={isPickup ? "Instruções específicas para a retirada..." : "Instruções específicas para a entrega/montagem..."}
                                />
                            </SectionCard>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="max-w-5xl mx-auto animate-fade-in">
                            <SectionCard
                                icon={isBudget ? "bi bi-calculator" : "bi bi-credit-card-2-front"}
                                iconBg="bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/20"
                                title={isBudget ? "Simulação Financeira" : "Condição de Pagamento"}
                                subtitle={isBudget ? "Opções de parcelamento por bandeira" : "Formas e prazos acordados"}
                            >
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm transition-colors duration-300">
                                    {isBudget ? (
                                        <PaymentSimulator totalValue={state.paymentsSummary.totalOrderValue} />
                                    ) : (
                                        <PaymentsTable
                                            payments={state.payments}
                                            setPayments={actions.setPayments}
                                            summary={state.paymentsSummary}
                                        />
                                    )}
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="animate-fade-in bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 md:p-6 border border-slate-100 dark:border-slate-800 shadow-premium-sm max-w-7xl mx-auto overflow-hidden flex flex-col h-full min-h-0">
                             {/* Header */}
                             <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100/50 dark:border-slate-800/50 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shadow-sm">
                                        <i className="bi bi-check-all text-2xl" />
                                     </div>
                                     <div className="flex flex-col">
                                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-0.5">
                                            {isBudget ? 'Resumo da Proposta' : 'Confirmação do Pedido'}
                                        </h2>
                                        <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">
                                            {isBudget ? 'ORÇAMENTO' : `#{state.currentOrderId?.slice(-6).toUpperCase() || 'NOVO-PEDIDO'}`}
                                        </span>
                                     </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    {isBudget && state.currentOrderId && (
                                        <button 
                                            type="button"
                                            onClick={() => window.open(`/sales-order/print/${state.currentOrderId}?type=budget`, '_blank')}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            <i className="bi bi-printer-fill"></i>
                                            Imprimir Orçamento
                                        </button>
                                    )}
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                        state.status === 'scheduled' ? 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/40' : 
                                        state.status === 'fulfilled' ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/40' : 
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {state.status === 'scheduled' ? 'Agendado' : state.status === 'fulfilled' ? 'Finalizado' : 'Rascunho'}
                                    </span>
                                </div>
                             </div>

                             {/* Main Summary Grid */}
                             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden h-full min-h-0">
                                
                                {/* Left Column: Items & Payments (7/12) */}
                                <div className="md:col-span-7 flex flex-col gap-3 min-h-0">
                                    {/* Items Table Compact */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 flex flex-col min-h-0">
                                        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                                            <i className="bi bi-box-seam text-blue-500 text-xs" />
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Itens do Pedido ({state.items.length})</span>
                                        </div>
                                        <div className="overflow-y-auto pr-2 custom-scrollbar min-h-0 flex-1">
                                            <table className="w-full text-left text-[10px]">
                                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                                                   <tr className="border-b border-slate-200 dark:border-slate-700/50">
                                                        <th className="py-1 font-black text-slate-400 uppercase tracking-widest">Produto</th>
                                                        <th className="py-1 font-black text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                                                        <th className="py-1 font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                                   </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                     {state.items.map((item, idx) => {

                                                        
                                                        return (
                                                            <tr key={idx} className="group">
                                                                <td className="py-1.5 font-bold text-slate-700 dark:text-slate-300 pr-2">
                                                                    <div className="flex items-center gap-2">
                                                                        {false && <i className="bi bi-hammer text-red-500 text-[10px] animate-pulse" title="Item com montagem" />}
                                                                        <span>{item.description}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                                                                <td className="py-1.5 text-right font-black text-blue-600 dark:text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Payments Table Compact / Simulator info */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 flex-shrink-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className={`bi ${isBudget ? 'bi-calculator' : 'bi-credit-card-2-front'} text-indigo-500 text-xs`} />
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                                                {isBudget ? 'Opções Financeiras Simuladas' : 'Condição de Pagamento'}
                                            </span>
                                        </div>
                                        {isBudget ? (
                                            <p className="text-[10px] text-slate-500 font-bold italic px-2">
                                                Simulação baseada nas bandeiras: {settings.cardFlagRules?.map(r => r.flag).join(', ') || 'Nenhuma configurada'}
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {state.payments.map((p, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-bold">
                                                        <span className="text-slate-400 uppercase tracking-tighter">{p.method || 'Pagamento'}</span>
                                                        <span className="text-blue-600 dark:text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.amount)}</span>
                                                    </div>
                                                ))}
                                                {state.payments.length === 0 && <span className="text-[10px] text-slate-400 italic">Venda sem pagamentos informados</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Client / Seller / Logistics (5/12) */}
                                <div className="md:col-span-5 flex flex-col gap-4 min-h-0">
                                    {/* Seller Identity Card */}
                                    <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border-2 border-dashed border-blue-100 dark:border-blue-900/30 flex items-center justify-between group hover:border-blue-500 hover:shadow-lg transition-all shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <i className="bi bi-person-check text-base" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vendedor</span>
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-100 uppercase">{state.seller || <span className="text-red-500 animate-pulse">NÃO INFORMADO</span>}</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => actions.jumpToStep(1)} className="p-2 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <i className="bi bi-pencil-square" />
                                        </button>
                                    </div>

                                    {/* Client Identity Card */}
                                    <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-purple-500 hover:shadow-lg transition-all shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                                <i className="bi bi-person-badge text-base" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cliente / Fantasia</span>
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-100 uppercase truncate">
                                                    {!state.customerData.fullName || state.customerData.fullName === 'Nenhum' ? (isBudget ? 'NÃO INFORMADO (OPCIONAL)' : 'CONSUMIDOR FINAL') : state.customerData.fullName}
                                                </span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => actions.jumpToStep(1)} className="p-2 text-slate-300 hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                            <i className="bi bi-pencil-square" />
                                        </button>
                                    </div>

                                    {/* Logistics and Support Section */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex-1 flex flex-col overflow-hidden min-h-[220px]">
                                        <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isPickup ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">Logística e {isPickup ? 'Retirada' : 'Entrega'}</span>
                                            </div>
                                            <button type="button" onClick={() => actions.jumpToStep(3)} className={`p-1.5 rounded-lg transition-all ${isPickup ? 'hover:bg-amber-100 text-amber-500' : 'hover:bg-emerald-100 text-emerald-500'}`}>
                                                <i className="bi bi-pencil-square" />
                                            </button>
                                        </div>

                                        <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">


                                            {/* Date/Time Row */}
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3 shadow-inner">
                                                <div className={`w-8 h-8 rounded-lg ${isPickup ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center shrink-0`}>
                                                    <i className={`bi ${isPickup ? 'bi-calendar-check' : 'bi-truck'} text-sm`} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5 leading-none">Agendamento de {isPickup ? 'Retirada' : 'Entrega'}</span>
                                                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-100">
                                                        {state.shipping.scheduling?.notInformed ? 'NÃO INFORMADO' : (
                                                            `${new Date(state.shipping.scheduling?.date + 'T12:00:00').toLocaleDateString('pt-BR')} ${state.shipping.scheduling?.startTime ? `@ ${state.shipping.scheduling?.startTime} às ${state.shipping.scheduling?.endTime}` : ''}`
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Location Row */}
                                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex gap-3 shadow-inner">
                                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-400/10 text-red-500 flex items-center justify-center shrink-0">
                                                    <i className="bi bi-geo-alt text-sm" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5 leading-none">Localização Selecionada</span>
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase leading-tight">
                                                        {isPickup ? 'Loja Física - Móveis Morante' : (
                                                            `${state.customerData.fullAddress.street || 'Endereço não informado'}, ${state.customerData.fullAddress.number || 'S/N'}`
                                                        )}
                                                    </span>
                                                    {!isPickup && state.customerData.fullAddress.neighborhood && (
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                                            {state.customerData.fullAddress.neighborhood} - {state.customerData.fullAddress.city}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Final Note Row */}
                                            {state.observation && (
                                                <div className="bg-blue-50/40 dark:bg-blue-900/10 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                                    <div className="flex items-center gap-1.5 mb-1 text-[8px] font-black text-blue-500 uppercase tracking-widest">
                                                        <i className="bi bi-sticky-fill" /> Observações
                                                     </div>
                                                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 italic">"{state.observation}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Total Order Summary Button-like Badge */}
                                    <div className={`p-4 rounded-3xl flex items-center justify-between shadow-xl transition-all ${isBudget ? 'bg-indigo-600 shadow-indigo-500/10' : isPickup ? 'bg-purple-600 shadow-purple-500/10' : 'bg-emerald-600 shadow-emerald-500/10'} text-white`}>
                                        <div className="flex flex-col">
                                             <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{isBudget ? 'Total da Proposta' : 'Valor Geral do Pedido'}</span>
                                             <span className="text-[9px] font-bold opacity-60">Status: {isBudget ? 'Em Simulação' : 'Aguardando Conferência'}</span>
                                        </div>
                                        <div className="flex items-end gap-1 font-black italic">
                                             <span className="text-[10px] tracking-widest mb-1 opacity-80">R$</span>
                                             <span className="text-2xl tracking-tighter leading-none">
                                                 {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(state.paymentsSummary.totalOrderValue)}
                                             </span>
                                        </div>
                                    </div>
                                </div>
                             </div>
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
                buttonLabel={isBudget ? "Salvar Orçamento" : (state.status === 'draft' ? "Cadastrar Pedido" : "Salvar Edição")}
                colorScheme={isBudget ? "indigo" : (state.status === 'draft' ? "emerald" : "blue")}
            />
            
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }` }} />
        </form>
    );
};

export default SalesOrderFormSection;
