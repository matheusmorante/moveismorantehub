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
    const headerColor = isBudget ? 'bg-slate-800' : (isAssistance ? 'bg-orange-500' : (isPickup ? 'bg-purple-700' : 'bg-emerald-700'));

    if (!order) return null;

    return (
        <div className="flex flex-col gap-2 text-slate-900 bg-white min-h-screen px-4 py-2 font-sans transition-colors duration-300">
            {/* Professional Header */}
            <div className={`flex justify-between items-center p-6 rounded-3xl mb-4 ${headerColor} text-white print-exact-bg shadow-xl`}>
                <div className="flex gap-6 items-center">
                    <img src={logoMorante} alt="Móveis Morante" className="w-16 h-16 rounded-full object-cover border-4 border-white/30 shadow-lg" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter leading-none">MÓVEIS MORANTE</h1>
                        <div className="text-[11px] font-bold opacity-80 uppercase tracking-[0.3em] mt-1.5 ml-1">Excelência em cada detalhe</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">
                        {isBudget ? 'ORÇAMENTO / PROPOSTA' : (isAssistance ? 'ORDEM DE SERVIÇO' : (isPickup ? 'PEDIDO DE RETIRADA' : 'PEDIDO DE ENTREGA'))}
                    </div>
                    <div className="text-[11px] font-black opacity-90 uppercase tracking-widest flex items-center justify-end gap-2">
                        <i className="bi bi-hash"></i>
                        {order.id?.slice(-6).toUpperCase() || 'NOVO'}
                    </div>
                    <div className="text-[10px] font-bold opacity-75 mt-1 uppercase tracking-tight flex items-center justify-end gap-2">
                        <i className="bi bi-calendar3"></i>
                        EMISSÃO: {formatToBRDate(order.date)}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center px-4 py-1 bg-slate-50 rounded-2xl border border-slate-100 mb-2 print-exact-bg">
                <div className="flex items-center gap-2">
                    <i className="bi bi-person-badge text-slate-400 text-base"></i>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Atendente:</span>
                    <span className="text-sm font-black text-slate-800 ml-1 uppercase">{order.seller || "Não Informado"}</span>
                </div>
                {isBudget && (
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">Validade:</span>
                        <span className="text-sm font-black text-slate-800 ml-1">7 DIAS CORRIDOS</span>
                    </div>
                )}
            </div>

            {tags.length > 0 && !isBudget && (
                <div className="border-2 border-red-500/20 rounded-2xl p-3 bg-red-50/30 mb-2 print-exact-bg-light">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-2 flex items-center gap-2">
                        <i className="bi bi-exclamation-octagon-fill"></i>
                        OBSERVAÇÕES OPERACIONAIS
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-white border border-red-100 text-[11px] font-bold rounded-lg text-red-700 uppercase tracking-tight shadow-sm">
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
            
            <div className="mt-4">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2 flex items-center gap-2">
                    <i className="bi bi-list-check"></i> ESPECIFICAÇÕES DOS ITENS
                </div>
                <ItemsTable items={order.items} summary={order.itemsSummary} />
            </div>

            <div className={`grid ${showShippingColumn ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mt-6 pt-4 border-t-2 border-slate-100`}>
                {showShippingColumn && (
                    <div className="space-y-2">
                        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                            {isBudget ? 'LOGÍSTICA PREVISTA' : `DETALHES DA ${isPickup ? 'RETIRADA' : 'ENTREGA'}`}
                        </div>
                        <div className="bg-white rounded-3xl overflow-hidden">
                            <ShippingData shipping={order.shipping} isBudget={isBudget} />
                        </div>
                    </div>
                )}

                {isBudget ? (
                    <div className="space-y-2">
                        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">CONDIÇÕES DE PAGAMENTO</div>
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col justify-center gap-4 print-exact-bg">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 print-exact-bg">
                                    <i className="bi bi-credit-card-2-front-fill text-base leading-none"></i>
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-0.5">Opções de Parcelamento</h4>
                                    <p className="text-xs text-slate-700 leading-normal">
                                        Parcelamos em até <strong className="text-indigo-700 font-black">10x sem juros</strong> no <strong className="font-bold text-slate-800">Visa, Master, Elo e Hiper</strong>.
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        * Senff com juros.
                                    </p>
                                </div>
                            </div>
                            <div className="h-[1px] bg-slate-200"></div>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 print-exact-bg">
                                    <i className="bi bi-cash-coin text-base leading-none"></i>
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-0.5">Pagamento à Vista</h4>
                                    <p className="text-xs text-slate-700 leading-normal">
                                        Desconto especial para pagamento no <strong className="text-emerald-700 font-black">Débito, Pix e Dinheiro</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    hasPayments && (
                        <div className="space-y-2">
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">CONDIÇÕES COMERCIAIS</div>
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

            {/* Terms and Signatures for Budgets */}
            {isBudget && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-center gap-4 print-exact-bg">
                        <i className="bi bi-info-circle-fill text-amber-500 text-xl"></i>
                        <p className="text-[11px] font-black uppercase tracking-tight text-amber-800 leading-tight">
                            Atenção: Os preços e condições descritos nesta proposta são válidos por 7 dias e podem sofrer alterações sem aviso prévio após este período ou em caso de variações de estoque.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Termos e Condições</h3>
                        <ul className="text-[9px] text-slate-500 space-y-1 font-medium leading-tight list-disc pl-3">
                            <li>Prazo de entrega contado após a confirmação do pagamento.</li>
                            <li>A montagem está inclusa apenas nos itens devidamente sinalizados.</li>
                            <li>Este documento não garante reserva de estoque até a efetivação do pedido.</li>
                            <li className="font-bold text-slate-700">Preços sujeitos a alteração sem aviso prévio.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Footer space */}
            <div className="mt-auto pt-8 pb-4 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">Móveis Morante - Qualidade e Confiança</p>
            </div>
            
            <style>{`
                @media print {
                    @page { margin: 1cm; }
                    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-exact-bg-light { background-color: #fef2f2 !important; }
                    .print-exact-bg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .bg-slate-50 { background-color: #f8fafc !important; }
                    .bg-slate-800 { background-color: #1e293b !important; }
                    .bg-amber-50 { background-color: #fffbeb !important; }
                    .border-slate-100 { border-color: #f1f5f9 !important; }
                    .border-slate-200 { border-color: #e2e8f0 !important; }
                }
            `}</style>
        </div>
    )
};

export default OrderPage;
