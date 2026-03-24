import CustomerData from "./CustomerData";
import ItemsTable from "./ItemsTable";
import PaymentsTable from "./PaymentsTable";
import ShippingData from "./ShippingData";
import { useEffect } from "react";
import { formatToBRDate } from "../utils/formatters";
import logoMorante from "../../assets/logo.jpeg";

const OrderPage = () => {
    const storedOrder = sessionStorage.getItem('order');
    const order = storedOrder ? JSON.parse(storedOrder) : null;

    useEffect(() => {
        if (order) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [order]);

    if (!order) return null;

    return (
        <div className="flex flex-col gap-2 text-slate-900 bg-white min-h-screen px-4 py-2 font-sans transition-colors duration-300">
            {/* Professional Header */}
            <div className="flex justify-between items-center border-b-8 border-slate-900 pb-2 mb-1">
                <div className="flex gap-4 items-center">
                    <img src={logoMorante} alt="Móveis Morante" className="w-16 h-16 rounded-full object-cover border-4 border-slate-100 shadow-md" />
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">MÓVEIS MORANTE</h1>
                        
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">PEDIDO DE VENDA</div>
                    <div className="text-[11px] font-bold text-slate-900 mt-1 uppercase tracking-tight">EMISSÃO: {formatToBRDate(order.date)}</div>
                </div>
            </div>

            <div className="flex justify-between items-center px-2 py-0">
                <div className="flex items-center gap-2">
                    <i className="bi bi-person-badge text-slate-400 text-lg"></i>
                    <span className="text-[15px] font-black uppercase tracking-widest text-slate-400">Vendedor:</span>
                    <span className="text-xl font-bold text-slate-900 ml-1 uppercase">{order.seller}</span>
                </div>
            </div>

            {/* Observações de Entrega - NOW RED / ALERT STYLE */}
            {order.observation && (
                <div className="border border-red-500 rounded-2xl p-2 bg-red-50/50">
                    <h2 className="text-base font-black uppercase tracking-widest text-red-600 mb-1 flex items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        AVISOS IMPORTANTES SOBRE A ENTREGA
                    </h2>
                    <div className="flex flex-wrap gap-1">
                        {order.observation.split(';').filter((t: string) => t.trim() !== "").map((tag: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-white border border-red-200 text-base font-black rounded-xl text-red-700 uppercase tracking-tight shadow-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <CustomerData customerData={order.customerData} isPickup={order.shipping?.deliveryMethod === 'pickup'} />
            
            <div className="my-1">
                <div className="text-base font-black uppercase tracking-widest text-slate-400 mb-0.5 ml-1">ITENS DO PEDIDO</div>
                <ItemsTable items={order.items} summary={order.itemsSummary} />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t-2 border-slate-200">
                <div className="space-y-1">
                    <div className="text-base font-black uppercase tracking-widest text-slate-400 mb-0.5 ml-1">DETALHES DA ENTREGA</div>
                    <div className="bg-white p-1 rounded-2xl border border-slate-50 shadow-sm">
                        <ShippingData shipping={order.shipping} />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="text-base font-black uppercase tracking-widest text-slate-400 mb-0.5 ml-1">RESUMO FINANCEIRO</div>
                    <div className="bg-white p-1 rounded-2xl border border-slate-50 shadow-sm">
                        <PaymentsTable
                            payments={order.payments}
                            summary={order.paymentsSummary}
                        />
                    </div>
                </div>
            </div>

            {/* Footer space */}
            <div className="mt-auto pt-4 pb-2"></div>
            
            <style>{`
                @media print {
                    body { background: white !important; }
                    .bg-slate-50\\/50 { background-color: #f8fafc !important; }
                    .bg-red-50\\/50 { background-color: #fef2f2 !important; }
                    .border-slate-100 { border-color: #f1f5f9 !important; }
                    .border-slate-200 { border-color: #e2e8f0 !important; }
                    .border-red-500 { border-color: #ef4444 !important; }
                }
            `}</style>
        </div>
    )
};

export default OrderPage;
