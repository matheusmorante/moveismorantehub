import Order from "../../types/order.type";
import ModalHeader from "./OrderDetailsModalComponents/ModalHeader";
import { CustomerSection, ShippingSection, SchedulingSection } from "./OrderDetailsModalComponents/CustomerShippingInfo";
import { ItemsTable, FinancialSummary, PaymentDetails } from "./OrderDetailsModalComponents/ItemsFinancialInfo";
import MapRoute from "../SalesOrder/ShippingComponents/MapRoute";

interface Props {
    order: Order;
    onClose: () => void;
    onEdit?: (order: Order) => void;
    isReadOnly?: boolean;
}

import { autoCalculateRouteDistance } from "../../utils/maps";
import { updateOrder } from "../../utils/orderHistoryService";
import { toast } from "react-toastify";
import { formatOrderCode } from "../../utils/orderCode";
import { splitNoticeTags } from "../../utils/noticeTags";
import { useState, useEffect } from "react";

const OrderDetailsModal = ({ order: initialOrder, onClose, onEdit, isReadOnly }: Props) => {
    const [order, setOrder] = useState(initialOrder);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const isPickup = order.shipping?.deliveryMethod === 'pickup';

    const handleRecalculate = async () => {
        if (!order.customerData?.fullAddress) return;
        setIsRecalculating(true);
        try {
            const res = await autoCalculateRouteDistance(order.customerData.fullAddress);
            if (res) {
                const updatedOrder = {
                    ...order,
                    shipping: {
                        ...order.shipping!,
                        distance: res.distanceKm,
                        durationMinutes: res.durationMinutes,
                        destinationCoords: res.destinationCoords,
                        routeGeoJSON: res.routeGeoJSON
                    }
                };
                await updateOrder(order.id!, updatedOrder);
                setOrder(updatedOrder);
                // No toast on automatic success to avoid cluttering, but keeping for manual if needed
            }
        } catch (e) {
            console.error("Erro no cálculo automático de rota:", e);
        } finally {
            setIsRecalculating(false);
        }
    };

    useEffect(() => {
        const needsCalc = !isReadOnly && !isPickup && (!order.shipping?.distance || !order.shipping?.durationMinutes);
        if (needsCalc) {
            handleRecalculate();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/70 p-0 backdrop-blur-md animate-fade-in transition-colors duration-300 xl:p-6"
            onClick={onClose}
        >
            <div
                className="flex h-full w-full flex-col overflow-hidden border-0 bg-white shadow-2xl animate-slide-up transition-colors duration-300 dark:bg-slate-900 xl:h-auto xl:max-h-[92vh] xl:w-[min(94vw,1280px)] xl:rounded-[2.5rem] xl:border xl:border-slate-100 xl:dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                <ModalHeader
                    reference={formatOrderCode(order)}
                    orderDate={order.date}
                    seller={order.seller}
                    onClose={onClose}
                    onEdit={onEdit ? () => onEdit(order) : undefined}
                />

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 xl:p-8 custom-scrollbar">
                    <div className="space-y-6 sm:space-y-8">
                        {/* 1. Cliente, Endereço e Agendamento */}
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
                            <CustomerSection
                                fullName={order.customerData?.fullName}
                                phone={order.customerData?.phone}
                                noPhone={order.customerData?.noPhone}
                                email={order.customerData?.email}
                                cpfCnpj={order.customerData?.cpfCnpj}
                                observations={order.customerData?.observations}
                                additionalContacts={order.customerData?.additionalContacts}
                            />

                            <div className="space-y-6">
                                {!isPickup && (
                                    <div className="relative group/shipping">
                                        <ShippingSection
                                            fullAddress={order.shipping?.deliveryAddress || order.customerData?.fullAddress}
                                            destinationCoords={order.shipping?.destinationCoords}
                                            distance={order.shipping?.distance}
                                            durationMinutes={order.shipping?.durationMinutes}
                                            isReadOnly={isReadOnly}
                                        />
                                        {isRecalculating && (
                                            <div className="absolute top-0 right-0 p-2 text-[10px] font-black uppercase tracking-widest text-blue-500 transition-colors flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                Calculando Dados Logísticos...
                                            </div>
                                        )}
                                    </div>
                                )}
                                <SchedulingSection
                                    scheduling={order.shipping?.scheduling}
                                    isPickup={isPickup}
                                />
                            </div>
                        </div>

                        {/* 2. Lista de Itens (abaixo do agendamento da entrega) */}
                        <ItemsTable items={[
                            ...(order.items || []),
                            ...(order.assistanceItems || []).map(ai => ({
                                ...ai,
                                unitPrice: 0,
                                isAssistanceItem: true
                            }))
                        ]} />

                        {/* 3. Resumo Financeiro Minimalista (abaixo dos itens) */}
                        <FinancialSummary
                            itemsSummary={order.itemsSummary}
                            shippingValue={order.shipping?.value || 0}
                            totalValue={order.paymentsSummary?.totalOrderValue || 0}
                        />

                        {/* 4. Pagamentos (acima de observações) */}
                        <PaymentDetails
                            payments={order.payments}
                            totalPaid={order.paymentsSummary?.totalAmountPaid}
                            amountRemaining={order.paymentsSummary?.amountRemaining}
                        />

                        {/* 5. Observações Importantes */}
                        {order.observation && (
                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                                    <i className="bi bi-megaphone-fill text-red-500" /> Observações Importantes
                                </h3>
                                <div className="flex flex-wrap gap-2.5 p-4 sm:p-5 bg-red-50/40 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl transition-colors duration-300">
                                    {splitNoticeTags(order.observation).map((tag: string, idx: number) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 shadow-sm shadow-red-100/50 dark:shadow-none"
                                        >
                                            <i className="bi bi-exclamation-circle-fill text-[11px] text-red-500" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                <div className="px-4 py-4 sm:px-10 sm:py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex justify-center transition-colors duration-300">
                    <p className="text-[9px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-[0.3em]">
                        ERP Móveis Morante • Logística v2.0
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}} />
        </div>
    );
};

export default OrderDetailsModal;
