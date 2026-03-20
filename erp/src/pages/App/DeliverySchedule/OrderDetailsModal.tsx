import Order from "../../types/order.type";
import ModalHeader from "./OrderDetailsModalComponents/ModalHeader";
import { CustomerSection, ShippingSection, SchedulingSection } from "./OrderDetailsModalComponents/CustomerShippingInfo";
import { ItemsTable, FinancialSummary } from "./OrderDetailsModalComponents/ItemsFinancialInfo";
import MapRoute from "../SalesOrder/ShippingComponents/MapRoute";

interface Props {
    order: Order;
    onClose: () => void;
    onEdit?: (order: Order) => void;
}

const OrderDetailsModal = ({ order, onClose, onEdit }: Props) => {
    const isPickup = order.shipping?.deliveryMethod === 'pickup';

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in transition-colors duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full h-full sm:w-auto sm:h-auto sm:max-w-4xl max-h-none sm:max-h-[90vh] rounded-none sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 sm:border border-slate-100 dark:border-slate-800 transition-colors duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <ModalHeader
                    reference={order.id?.slice(-8).toUpperCase() || "N/A"}
                    onClose={onClose}
                    onEdit={onEdit ? () => onEdit(order) : undefined}
                />

                <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                        {/* Left Column: Customer & Shipping */}
                        <div className="space-y-8 sm:space-y-10">
                            <CustomerSection
                                fullName={order.customerData?.fullName}
                                phone={order.customerData?.phone}
                            />


                            {!isPickup && (
                                <ShippingSection
                                    fullAddress={order.customerData?.fullAddress}
                                    destinationCoords={order.shipping?.destinationCoords}
                                    routeGeoJSON={order.shipping?.routeGeoJSON}
                                />
                            )}
                            <SchedulingSection
                                scheduling={order.shipping?.scheduling}
                                isPickup={isPickup}
                            />
                        </div>

                        {/* Right Column: Items & Summary */}
                        <div className="space-y-10">
                            <ItemsTable items={[
                                ...(order.items || []),
                                ...(order.assistanceItems || []).map(ai => ({
                                    ...ai,
                                    unitPrice: 0,
                                    isAssistanceItem: true
                                }))
                            ]} />
                            <FinancialSummary
                                itemsSummary={order.itemsSummary}
                                shippingValue={order.shipping?.value || 0}
                                totalValue={order.paymentsSummary?.totalOrderValue || 0}
                            />
                        </div>
                    </div>

                    {order.observation && (
                        <div className="mt-12 p-8 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2rem] transition-colors duration-300">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-3 flex items-center gap-2">
                                <i className="bi bi-chat-left-dots-fill" /> Observações Internas
                            </h4>
                            <p className="text-sm font-bold text-amber-900/70 dark:text-amber-200/50 italic leading-relaxed">
                                "{order.observation}"
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-10 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex justify-center transition-colors duration-300">
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
