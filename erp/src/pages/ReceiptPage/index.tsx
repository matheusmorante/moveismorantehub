import React, { useEffect } from "react";
import { getSettings } from '@/pages/utils/settingsService';
import ReceiptPrintDocument from "./ReceiptPrintDocument";

const ReceiptPage = () => {
    const storedOrder = sessionStorage.getItem('order');
    const order = storedOrder ? JSON.parse(storedOrder) : null;
    const settings = getSettings();
    const queryParams = new URLSearchParams(window.location.search);
    const isSilent = queryParams.get('silent') === '1';

    useEffect(() => {
        if (order && !isSilent) {
            const timer = setTimeout(() => window.print(), 400);
            return () => clearTimeout(timer);
        }
    }, [order, isSilent]);

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

    return <ReceiptPrintDocument order={order} settings={settings} />;
};

export default ReceiptPage;
