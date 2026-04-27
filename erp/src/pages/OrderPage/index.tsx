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
    const queryParams = new URLSearchParams(window.location.search);
    const isBudget = queryParams.get('type') === 'budget' || order?.orderType === 'budget';

    const allObs: string[] = [];
    if (order?.observation) allObs.push(...order.observation.split(';'));
    if (order?.shipping?.deliveryAddress?.observation) {
        allObs.push(...order.shipping.deliveryAddress.observation.split(';'));
    }
    const tags = allObs.filter((t: string) => t.trim() !== "");

    const addr = order?.customerData?.fullAddress || {};
    const hasAnyAddress = !!(addr.street || addr.neighborhood || addr.city);
    // Hide shipping data column if budget AND no address OR any shipping value/distance info
    const showShippingColumn = !isBudget || 
                               hasAnyAddress || 
                               !!order.shipping?.distance || 
                               (order.shipping?.value ?? 0) > 0;

    const hasPayments = order.payments && order.payments.length > 0;

    useEffect(() => {
        if (order) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [order]);

    const isAssistance = order.orderType === 'assistance';
    const isPickup = order.shipping?.deliveryMethod === 'pickup';
    const headerColor = isAssistance ? 'bg-orange-500' : (isPickup ? 'bg-purple-700' : 'bg-emerald-700');

    if (!order) return null;

    return (
        <div className="flex flex-col gap-2 text-slate-900 bg-white min-h-screen px-4 py-2 font-sans transition-colors duration-300">
            {/* Professional Header */}
            <div className={`flex justify-between items-center p-4 rounded-3xl mb-2 ${headerColor} text-white print-exact-bg shadow-lg`}>
                <div className="flex gap-4 items-center">
                    <img src={logoMorante} alt="Móveis Morante" className="w-14 h-14 rounded-full object-cover border-4 border-white/20 shadow-md" />
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none">MÓVEIS MORANTE</h1>
                        <div className="text-[10px] font-bold opacity-80 uppercase tracking-[0.2em] mt-1 ml-0.5">Sua casa, seu estilo</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-black uppercase tracking-tighter leading-none">
                        {isAssistance 
                            ? 'ORDEM DE SERVIÇO (ASSISTÊNCIA)'
                            : (isPickup 
                                ? 'PEDIDO DE RETIRADA' 
                                : (isBudget ? 'ORÇAMENTO / PROPOSTA COMERCIAL' : 'PEDIDO DE ENTREGA'))}
                    </div>
                    <div className="text-[11px] font-bold opacity-90 mt-2 uppercase tracking-tight flex items-center justify-end gap-2">
                        <i className="bi bi-calendar-check"></i>
                        EMISSÃO: {formatToBRDate(order.date)}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center px-2 py-0">
                <div className="flex items-center gap-2">
                    <i className="bi bi-person-badge text-slate-400 text-base"></i>
                    <span className="text-[12px] font-black uppercase tracking-widest text-slate-400">Vendedor:</span>
                    <span className="text-base font-bold text-slate-900 ml-1 uppercase">{order.seller}</span>
                </div>
            </div>

            {tags.length > 0 && (
                <div className="border border-red-500 rounded-2xl p-2 bg-red-50/50 print-exact-bg-light shadow-sm">
                    <h2 className="text-sm font-black uppercase tracking-widest text-red-600 mb-1 flex items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        AVISOS IMPORTANTES SOBRE A {order.shipping?.deliveryMethod === 'pickup' ? 'RETIRADA' : 'ENTREGA'}
                    </h2>
                    <div className="flex flex-wrap gap-1">
                        {tags.map((tag: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-red-200 text-xs font-black rounded text-red-700 uppercase tracking-tight shadow-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <CustomerData 
                customerData={order.customerData} 
                isPickup={order.shipping?.deliveryMethod === 'pickup'} 
                noAddress={order.shipping?.noAddress}
            />
            
            <div className="mt-1">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-0.5 ml-1">ITENS DO PEDIDO</div>
                <ItemsTable items={order.items} summary={order.itemsSummary} />
            </div>

            <div className={`grid ${showShippingColumn ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-1 pt-1 border-t border-slate-200`}>
                {showShippingColumn && (
                    <div className="space-y-0.5">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-0.5 ml-1">DETALHES DA {order.shipping?.deliveryMethod === 'pickup' ? 'RETIRADA' : 'ENTREGA'}</div>
                        <div className="bg-white p-1 rounded-2xl border border-slate-50 shadow-sm">
                            <ShippingData shipping={order.shipping} isBudget={isBudget} />
                        </div>
                    </div>
                )}

                {hasPayments && (
                    <div className="space-y-0.5">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-0.5 ml-1">PAGAMENTO</div>
                        <div className="bg-white p-1 rounded-2xl border border-slate-50 shadow-sm">
                            <PaymentsTable
                                payments={order.payments}
                                summary={order.paymentsSummary}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer space */}
            <div className="mt-auto pt-4 pb-2"></div>
            
            <style>{`
                @media print {
                    body { background: white !important; }
                    .print-exact-bg-light { background-color: #fef2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
