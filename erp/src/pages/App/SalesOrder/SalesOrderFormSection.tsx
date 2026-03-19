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
                />

                {/* Wizard Steps Content */}
                <div className="max-w-[1400px] mx-auto pb-10">
                    {currentStep === 1 && (
                        <div className="flex flex-col gap-8 animate-fade-in">
                            {/* Prominent Selection for Delivery Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => actions.setShipping(prev => ({ ...prev, deliveryMethod: 'delivery' }))}
                                    className={`group flex items-center gap-4 p-6 rounded-3xl border-4 transition-all duration-500 ${!isPickup ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-blue-500/30'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${!isPickup ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                                        <i className="bi bi-truck text-2xl" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-lg font-black tracking-tight block">Entrega</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${!isPickup ? 'text-white/60' : 'text-slate-400'}`}>Frete calculado por rota</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => actions.setShipping(prev => ({ ...prev, deliveryMethod: 'pickup' }))}
                                    className={`group flex items-center gap-4 p-6 rounded-3xl border-4 transition-all duration-500 ${isPickup ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl shadow-emerald-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-emerald-500/30'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${isPickup ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'}`}>
                                        <i className="bi bi-hand-index-thumb-fill text-2xl" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-lg font-black tracking-tight block">Retirada na Loja</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isPickup ? 'text-white/60' : 'text-slate-400'}`}>Sem custos de frete</span>
                                    </div>
                                </button>
                            </div>

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
                                title="Avisos sobre a Entrega"
                                className="bg-white dark:bg-slate-900"
                            >
                                <NoticeInput
                                    value={state.observation}
                                    onChange={(val) => actions.setObservation(val)}
                                    placeholder="Instruções específicas para a entrega/montagem..."
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
                        <div className="animate-fade-in bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-100 dark:border-slate-800 text-center">
                             <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i className="bi bi-check-all text-4xl" />
                             </div>
                             <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Quase lá!</h2>
                             <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">Confira os detalhes abaixo e clique em finalizar para registrar o pedido no sistema.</p>
                             
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-left border border-slate-100 dark:border-slate-800 mb-8">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cliente</h4>
                                    <p className="text-sm font-bold">{state.customerData.fullName || 'Não informado'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total</h4>
                                    <p className="text-sm font-bold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(state.paymentsSummary.totalOrderValue)}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Vendedor</h4>
                                    <p className="text-sm font-bold">{state.seller || 'Não informado'}</p>
                                </div>
                                <div className="md:col-span-3 pt-6 border-t border-slate-200 dark:border-slate-700/50 mt-2 flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status Atual</h4>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit ${
                                            state.status === 'scheduled' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 
                                            state.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 
                                            'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                        }`}>
                                            {state.status === 'scheduled' ? 'Confirmado / Agendado' : state.status === 'fulfilled' ? 'Entregue / Finalizado' : 'Rascunho'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 text-right">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Logística</h4>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {isPickup ? 'Retirada na Loja' : 'Entrega no Endereço'}
                                        </span>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Wizard Navigation Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/95 backdrop-blur-md py-6 px-8 shrink-0 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={actions.goToPrevStep}
                                className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                            >
                                <i className="bi bi-arrow-left" /> Anterior
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-2 rounded-xl border border-slate-100 dark:border-slate-800 mr-4">
                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">Total</span>
                            <span className="text-lg font-black italic text-slate-800 dark:text-slate-100 tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(state.paymentsSummary.totalOrderValue)}
                            </span>
                        </div>

                        {currentStep < 5 ? (
                            <button
                                type="button"
                                onClick={actions.goToNextStep}
                                className="px-10 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-blue-900/20 transition-all flex items-center gap-2 active:scale-95"
                            >
                                Próximo <i className="bi bi-arrow-right text-lg" />
                            </button>
                        ) : (
                            <FormFooter
                                currentOrder={state.currentOrder}
                                totalOrderValue={state.paymentsSummary.totalOrderValue}
                                isSaving={state.isSaving}
                                onCompleteOrder={actions.handleCompleteOrder}
                                buttonLabel={state.currentOrderId ? "Salvar Alterações" : "Finalizar Pedido"}
                            />
                        )}
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }` }} />
        </form>
    );
};

export default SalesOrderFormSection;
