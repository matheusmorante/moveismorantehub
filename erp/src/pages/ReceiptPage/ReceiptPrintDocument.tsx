import React from "react";
import CustomerData from "./CustomerData";
import Header from "./Header";
import ItemsTable from "./ItemsTable";
import PaymentsTable from "./PaymentsTable";
import ShippingData from "./ShippingData";
import DigitalSignatureBadge from "./DigitalSignatureBadge";
import Order from "@/pages/types/order.type";

interface ReceiptPrintDocumentProps {
    order: Order;
    settings: any;
}

export const ReceiptPrintDocument: React.FC<ReceiptPrintDocumentProps> = ({ order, settings }) => {
    return (
        <div className="flex flex-col gap-1 text-slate-900 bg-white p-4 min-h-screen">
            <Header seller={order.seller} />
            <CustomerData 
                customerData={order.customerData} 
                isPickup={order.shipping?.deliveryMethod === 'pickup'} 
            />
            
            <ItemsTable items={order.items} summary={order.itemsSummary} />

            <div className="flex flex-row w-full justify-between gap-8 mt-2">
                <div className="flex flex-col gap-2 w-1/2">
                    <ShippingData shipping={order.shipping} />
                    
                    <div className="mt-4 pt-2">
                        <DigitalSignatureBadge 
                            order={order} 
                            sellerName={typeof order?.seller === 'string' ? order.seller : order?.seller?.fullName} 
                        />
                    </div>
                </div>

                <div className="w-1/2">
                    <PaymentsTable
                        payments={order?.payments || []}
                        summary={order?.paymentsSummary}
                    />
                </div>
            </div>

            {/* Seu Lizandro Interaction Area */}
            <div className="mt-2 pt-2">
                <div className="flex items-center gap-6 px-6 py-4 bg-slate-50/80 rounded-3xl border border-slate-100 relative overflow-hidden">
                    <div className="flex-shrink-0 z-10 relative">
                        <div className="w-28 h-28 bg-white rounded-3xl p-1 shadow-md border border-slate-100 overflow-hidden">
                            <img 
                                src={settings?.aiPrompts?.aiMascotVariants?.receipt || settings?.aiPrompts?.aiMascot || "/lizandro.png"} 
                                alt="Seu Lizandro" 
                                className="w-full h-full object-cover rounded-2xl"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 z-10 relative">
                        <div className="relative">
                            <p className="text-blue-900 font-black italic text-2xl leading-tight tracking-tight mb-2">
                                "Ah, que alegria! Ficamos muito felizes em fazer parte do seu lar."
                            </p>
                            <p className="text-sm text-blue-400 font-black uppercase tracking-[0.25em]">
                                Muito obrigado pela preferência!
                            </p>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full -mr-24 -mt-24 blur-3xl z-0"></div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .no-print { display: none !important; }
                    .header-logo-container {
                        width: 13rem !important;
                        height: 13rem !important;
                        padding: 0.5rem !important;
                        border-radius: 1.25rem !important;
                    }
                    .header-logo-container img {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: contain !important;
                    }
                    @page { margin: 10mm; }
                }
            ` }} />
        </div>
    );
};

export default ReceiptPrintDocument;
