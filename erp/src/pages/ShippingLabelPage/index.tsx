import React, { useEffect } from "react";
import Order from "../types/order.type";
import logoMorante from "../../assets/logo.jpeg";

const ShippingLabelPage = () => {
    const storedOrder = sessionStorage.getItem('order');
    const order: Order | null = storedOrder ? JSON.parse(storedOrder) : null;

    useEffect(() => {
        if (order) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [order]);

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-white text-slate-800">
                <i className="bi bi-exclamation-triangle-fill text-5xl text-amber-500 mb-4"></i>
                <h1 className="text-2xl font-black italic">Nenhum pedido encontrado</h1>
                <button
                    onClick={() => window.close()}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs"
                >
                    Fechar Janela
                </button>
            </div>
        );
    }

    const customer = order.customerData;
    const shipping = order.shipping;
    const address = shipping?.deliveryAddress || {
        street: customer?.fullAddress?.street,
        number: customer?.fullAddress?.number,
        complement: customer?.fullAddress?.complement,
        neighborhood: customer?.fullAddress?.neighborhood,
        city: customer?.fullAddress?.city,
        state: customer?.fullAddress?.state
    };

    return (
        <div className="min-h-screen bg-white p-8 flex items-center justify-center">
            {/* Label Container - Optimized for small label printers or standard A4 half */}
            <div className="w-[10cm] border-4 border-slate-900 p-8 rounded-3xl flex flex-col gap-6 relative overflow-hidden">
                {/* Decorative Pattern Background */}
                <div className="absolute top-0 right-0 opacity-5 -mr-8 -mt-8 rotate-12 pointer-events-none">
                    <img src={logoMorante} alt="" className="w-64 h-64 grayscale rounded-full object-cover" />
                </div>

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 shrink-0 relative z-10">
                    <img src={logoMorante} alt="Móveis Morante" className="w-12 h-12 rounded-full object-cover border-2 border-slate-50 shadow-sm" />
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">PEDIDO</div>
                        <div className="text-2xl font-black text-slate-900">#{order.id?.slice(-8).toUpperCase()}</div>
                    </div>
                </div>

                {/* Receiver Info */}
                <div className="space-y-4 relative z-10">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">DESTINATÁRIO</div>
                        <div className="text-lg font-black text-slate-900 leading-tight uppercase">{customer?.fullName}</div>
                        <div className="text-sm font-bold text-slate-600 mt-1">{customer?.phone}</div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 underline underline-offset-4 decoration-slate-200">ENDEREÇO DE ENTREGA</div>
                        <div className="text-base font-black text-slate-800 leading-tight">
                            {address?.street}, {address?.number}
                            {address?.complement && ` - ${address?.complement}`}
                        </div>
                        <div className="text-sm font-bold text-slate-600 mt-1 uppercase">
                            {address?.neighborhood}
                        </div>
                        <div className="text-sm font-bold text-slate-500 uppercase">
                            {address?.city} - {address?.state}
                        </div>
                    </div>
                </div>

                {/* Footer / QR */}
                <div className="flex items-center justify-between pt-4 border-t-2 border-slate-100 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-truck text-lg text-slate-800"></i>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                                {shipping?.deliveryMethod === 'pickup' ? 'RETIRADA NA LOJA' : 'ENTREGA DOMICILIAR'}
                            </span>
                        </div>
                        {shipping?.scheduling?.date && (
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                AGENDADO: {shipping.scheduling.date} {shipping.scheduling.time && `| ${shipping.scheduling.time}`}
                            </div>
                        )}
                    </div>
                    
                    {/* Real Order QR Code */}
                    <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center p-1 border-2 border-slate-900 shadow-sm">
                        <img 
                            src={`https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(`https://morantehub.vercel.app/order/${order.id}`)}&choe=UTF-8`} 
                            alt="QR Code" 
                            className="w-full h-full"
                        />
                    </div>
                </div>

                {/* Warning / Important */}
                <div className="mt-2 text-center">
                    <div className="inline-block px-3 py-1 bg-red-600 text-white rounded-full text-[8px] font-black uppercase tracking-[0.3em]">
                        CUIDADO: PRODUTO FRÁGIL
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body { margin: 0; padding: 0; background: white; }
                    .no-print { display: none !important; }
                    @page { margin: 0; }
                }
            `}</style>
        </div>
    );
};

export default ShippingLabelPage;
