import React, { useEffect } from "react";
import CustomerData from "./CustomerData";
import Header from "./Header";
import ItemsTable from "./ItemsTable";
import PaymentsTable from "./PaymentsTable";
import ShippingData from "./ShippingData";
import { getSettings } from '@/pages/utils/settingsService';

const ReceiptPage = () => {
    const storedOrder = sessionStorage.getItem('order');
    const order = storedOrder ? JSON.parse(storedOrder) : null;
    const settings = getSettings();

    useEffect(() => {
        if (order) {
            const timer = setTimeout(() => window.print(), 400);
            return () => clearTimeout(timer);
        }
    }, [order]);

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-white text-slate-800">
                <i className="bi bi-exclamation-triangle-fill text-5xl text-amber-500 mb-4"></i>
                <h1 className="text-2xl font-black italic">Nenhum pedido encontrado no armazenamento</h1>
                <p className="text-slate-500 mt-2">Por favor, acesse através da lista de pedidos.</p>
                <button
                    onClick={() => window.close()}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs"
                >
                    Fechar Janela
                </button>
            </div>
        );
    }

    if (!order.customerData?.fullName || order.customerData.fullName === "Nenhum" || order.customerData.fullName === "Ao Consumidor") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-white text-slate-800">
                <i className="bi bi-x-circle-fill text-5xl text-red-500 mb-4"></i>
                <h1 className="text-2xl font-black italic">Recibo indisponível</h1>
                <p className="text-slate-500 mt-2 flex flex-col items-center gap-2">
                    Não é possível imprimir o recibo para pedidos sem um cliente associado.
                    <br />
                    <span className="text-sm font-semibold text-slate-400">Por favor, edite o pedido e adicione um cliente para imprimir o recibo.</span>
                </p>
                <button
                    onClick={() => window.close()}
                    className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-sm hover:bg-red-700 transition-colors"
                >
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 text-slate-900 bg-white p-4 min-h-screen">
            <Header seller={order.seller} />
            <CustomerData 
                customerData={order.customerData} 
                isPickup={order.shipping?.deliveryMethod === 'pickup'} 
                noAddress={order.shipping?.noAddress}
            />
            
            <ItemsTable items={order.items} summary={order.itemsSummary} />

            <div className="flex flex-row w-full justify-between gap-8 mt-2">
                <div className="flex flex-col gap-2 w-1/2">
                    <ShippingData shipping={order.shipping} />
                    
                    <div className="mt-16 pt-4">
                        <div className="max-w-[280px] text-center">
                            <div className="h-[1px] bg-slate-400 mb-2"></div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                Assinatura do Vendedor
                            </div>
                            {order?.seller?.fullName && (
                                <div className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">
                                    {order.seller.fullName}
                                </div>
                            )}
                        </div>
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
                                src={settings.aiPrompts?.aiMascotVariants?.receipt || settings.aiPrompts?.aiMascot || "/lizandro.png"} 
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
                    @page { margin: 10mm; }
                }
            ` }} />
        </div>
    )
};

export default ReceiptPage;