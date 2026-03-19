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

type SalesOrderFormSectionProps = {
    form: ReturnType<typeof useSalesOrderForm>;
    scrollRef?: React.RefObject<HTMLDivElement>;
};

const SalesOrderFormSection = ({ form, scrollRef }: SalesOrderFormSectionProps) => {
    const { state, actions } = form;
    const isPickup = state.shipping.deliveryMethod === 'pickup';
    const { currentStep } = state;

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
                    currentOrderId={state.currentOrderId}
                    deliveryMethod={state.shipping.deliveryMethod}
                    setDeliveryMethod={(method) => actions.setShipping(prev => ({ ...prev, deliveryMethod: method }))}
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
                                icon="bi bi-credit-card-2-front"
                                iconBg="bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/20"
                                title="Condição de Pagamento"
                                subtitle="Formas e prazos acordados"
                            >
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm transition-colors duration-300">
                                    <PaymentsTable
                                        payments={state.payments}
                                        setPayments={actions.setPayments}
                                        summary={state.paymentsSummary}
                                    />
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
                                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-0.5">Confirmação do Pedido</h2>
                                        <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">#{state.currentOrderId?.slice(-6).toUpperCase() || 'NOVO-PEDIDO'}</span>
                                     </div>
                                </div>
                                <div className="text-right">
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
                                                    {state.items.map((item, idx) => (
                                                        <tr key={idx} className="group">
                                                            <td className="py-1.5 font-bold text-slate-700 dark:text-slate-300 pr-2">
                                                                {item.productName}
                                                                {item.variationDescription && <span className="block text-[8px] text-slate-400 font-normal">{item.variationDescription}</span>}
                                                            </td>
                                                            <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                                                            <td className="py-1.5 text-right font-black text-blue-600 dark:text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Payments Table Compact */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 flex-shrink-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="bi bi-credit-card-2-front text-indigo-500 text-xs" />
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Condição de Pagamento</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {state.payments.map((p, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-bold">
                                                    <span className="text-slate-400 uppercase tracking-tighter">{p.methodName || 'Pagamento'}</span>
                                                    <span className="text-blue-600 dark:text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.amount)}</span>
                                                </div>
                                            ))}
                                            {state.payments.length === 0 && <span className="text-[10px] text-slate-400 italic">Venda sem pagamentos informados</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Client & Logistics (5/12) */}
                                <div className="md:col-span-5 flex flex-col gap-3 min-h-0">
                                    {/* Client Box */}
                                    <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 flex-1 min-h-0 flex flex-col overflow-hidden">
                                        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                                            <i className="bi bi-person-badge text-purple-500 text-xs" />
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Informações do Cliente</span>
                                        </div>
                                        <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Nome do Cliente / Fantasia</span>
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{state.customerData.fullName || 'CONSUMIDOR FINAL'}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Telefone</span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{state.customerData.phone || 'N/I'}</span>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">CPF / CNPJ</span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{state.customerData.document || 'N/I'}</span>
                                                </div>
                                            </div>

                                            {/* Shipping / Address if delivery */}
                                            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Endereço de {isPickup ? 'Retirada' : 'Entrega'}</span>
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded uppercase tracking-tighter">{isPickup ? 'Loja Física' : 'Domicílio'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPickup ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        <i className={`bi ${isPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck'} text-sm`} />
                                                    </div>
                                                    <span className="text-[10px] leading-tight font-bold text-slate-600 dark:text-slate-300">
                                                        {isPickup 
                                                            ? 'Retirada na loja física da Móveis Morante.' 
                                                            : state.customerData.fullAddress || 'Endereço não informado'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Date and Seller */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-slate-100/50 dark:bg-slate-800/40 p-2 px-3 rounded-xl border border-transparent">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 block">Vendedor</span>
                                                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100">{state.seller || 'NÃO DEFINIDO'}</span>
                                                </div>
                                                <div className="bg-slate-100/50 dark:bg-slate-800/40 p-2 px-3 rounded-xl border border-transparent">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 block">Previsão</span>
                                                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100">{state.orderDate ? new Date(state.orderDate).toLocaleDateString('pt-BR') : 'DATA N/I'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Observation */}
                                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 flex-shrink-0">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Observações do Pedido</span>
                                        <p className="text-[10px] text-slate-500 italic line-clamp-2 leading-tight">{state.observation || 'Sem observações adicionais.'}</p>
                                    </div>

                                    {/* Total Footer inside columns */}
                                    <div className={`p-3 rounded-2xl border flex items-center justify-between shadow-lg shadow-blue-500/10 flex-shrink-0 ${isPickup ? 'bg-purple-600 border-purple-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white'}`}>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80">Valor Total do Pedido</span>
                                            <span className="text-[10px] opacity-70">Confirme valores finais</span>
                                        </div>
                                        <span className="text-xl font-black italic tracking-tighter">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(state.paymentsSummary.totalOrderValue)}
                                        </span>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {currentStep < 5 && (
                 <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/95 backdrop-blur-md py-3 px-6 shrink-0 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
                     <div className="max-w-[1400px] mx-auto flex items-center justify-end">
                             <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 mr-2 shadow-sm min-w-fit">
                                 <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest mb-0">Total</span>
                                 <span className="text-lg font-black italic text-blue-600 dark:text-blue-400 tracking-tighter whitespace-nowrap">
                                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(state.paymentsSummary.totalOrderValue)}
                                 </span>
                             </div>
                     </div>
                 </div>
            )}
            {currentStep === 5 && (
                <FormFooter
                    currentOrder={state.currentOrder}
                    totalOrderValue={state.paymentsSummary.totalOrderValue}
                    isSaving={state.isSaving}
                    onCompleteOrder={actions.handleCompleteOrder}
                    onPrev={actions.goToPrevStep}
                    buttonLabel={state.currentOrderId ? "Salvar Alterações" : "Finalizar Pedido"}
                />
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }` }} />
        </form>
    );
};

export default SalesOrderFormSection;
