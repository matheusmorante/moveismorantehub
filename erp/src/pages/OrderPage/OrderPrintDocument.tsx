import React from "react";
import CustomerData from "./CustomerData";
import ItemsTable from "./ItemsTable";
import PaymentsTable from "./PaymentsTable";
import ShippingData from "./ShippingData";
import OrderHeader from "./OrderHeader";
import OrderSubHeader from "./OrderSubHeader";
import OrderOperationalNotices from "./OrderOperationalNotices";
import BudgetPaymentConditions from "./BudgetPaymentConditions";
import BudgetTermsAndConditions from "./BudgetTermsAndConditions";
import OrderPrintStyles from "./OrderPrintStyles";
import { splitNoticeTags } from "../utils/noticeTags";
import Order from "@/pages/types/order.type";

interface OrderPrintDocumentProps {
    order: Order;
    isBudget?: boolean;
}

export const OrderPrintDocument: React.FC<OrderPrintDocumentProps> = ({ order, isBudget = false }) => {
    const allObs: string[] = [];
    if (order?.observation) allObs.push(...splitNoticeTags(order.observation));
    if (order?.shipping?.deliveryAddress?.observation) {
        allObs.push(...splitNoticeTags(order.shipping.deliveryAddress.observation));
    }
    const tags = allObs.filter((t: string) => t.trim() !== "");

    const addr = order?.customerData?.fullAddress || {};
    const hasAnyAddress = !!(addr.street || addr.neighborhood || addr.city);
    const showShippingColumn = !isBudget || 
                               hasAnyAddress || 
                               !!order.shipping?.distance || 
                               (order.shipping?.value ?? 0) > 0;

    const hasPayments = order?.payments && order.payments.length > 0;
    const isPickup = order.shipping?.deliveryMethod === 'pickup';

    return (
        <div className="flex flex-col gap-2 text-slate-900 bg-white min-h-screen px-4 py-2 font-sans transition-colors duration-300">
            <OrderHeader order={order} isBudget={isBudget} />
            <OrderSubHeader seller={order.seller} isBudget={isBudget} />
            <OrderOperationalNotices tags={tags} isBudget={isBudget} />

            <CustomerData 
                customerData={order.customerData} 
                isPickup={isPickup} 
                noAddress={order.shipping?.noAddress}
            />
            
            <div className="mt-4">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2 flex items-center gap-2">
                    <i className="bi bi-list-check"></i> ESPECIFICAÇÕES DOS ITENS
                </div>
                <ItemsTable items={order.items} summary={order.itemsSummary} />
            </div>

            <div className={`grid ${showShippingColumn ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mt-6 pt-4 border-t-2 border-slate-100`}>
                {showShippingColumn && (
                    <div className="space-y-2">
                        {!isBudget && (
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                                {isPickup ? 'DETALHES DA RETIRADA' : 'DETALHES DA ENTREGA'}
                            </div>
                        )}
                        <div className="bg-white rounded-3xl overflow-hidden">
                            <ShippingData 
                                shipping={order.shipping} 
                                isBudget={isBudget} 
                                itemsTotalValue={order.itemsSummary?.itemsTotalValue}
                            />
                        </div>
                    </div>
                )}

                {isBudget ? (
                    <BudgetPaymentConditions />
                ) : (
                    hasPayments && (
                        <div className="space-y-2">
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">PAGAMENTOS</div>
                            <div className="bg-white rounded-3xl overflow-hidden">
                                <PaymentsTable
                                    payments={order.payments}
                                    summary={order.paymentsSummary}
                                />
                            </div>
                        </div>
                    )
                )}
            </div>

            {isBudget && <BudgetTermsAndConditions />}

            {/* Footer space */}
            <div className="mt-auto pt-8 pb-4 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">Móveis Morante - Qualidade e Confiança</p>
            </div>
            
            <OrderPrintStyles />
        </div>
    );
};

export default OrderPrintDocument;
