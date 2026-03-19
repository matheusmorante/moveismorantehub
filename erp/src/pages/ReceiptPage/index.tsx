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
        <div className="flex flex-col gap-5 text-slate-900 bg-white p-4 min-h-screen
         [&_th]:bg-slate-100 [&_td]:bg-white
         [&_input]:px-2 [&_input]:bg-white">
            <Header seller={order.seller} />
            <CustomerData customerData={order.customerData} isPickup={order.shipping?.deliveryMethod === 'pickup'} />
            <ItemsTable items={order.items} summary={order.itemsSummary} />

            <div className="flex flex-col lg:flex-row w-full justify-between gap-6">
                <div className="flex flex-col gap-4 w-[40%]">
                    {order?.shipping?.scheduling?.time && <ShippingData shipping={order.shipping} />}
                </div>
                <PaymentsTable
                    payments={order?.payments || []}
                    summary={order?.paymentsSummary}
                />
            </div>

            <div className="flex text-center gap-10 justify-center mt-10">
                <div className="assinatura">
                    <div className="text-slate-300">________________________________________________</div>
                    <div className="text-xs font-bold uppercase tracking-widest mt-2">Assinatura do Vendedor</div>
                </div>
            </div>

            {settings.receiptConfig?.footerText && (
                <div className="mt-12 pt-6 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-medium italic max-w-lg mx-auto leading-relaxed">
                        {settings.receiptConfig.footerText}
                    </p>
                </div>
            )}
        </div>
    )
};

export default ReceiptPage;