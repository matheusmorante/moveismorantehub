import { formatToBRDate } from "../utils/formatters";
import { formatOrderCode } from "../utils/orderCode";
import logoMorante from "../../assets/logo.jpeg";

interface OrderHeaderProps {
    order: any;
    isBudget: boolean;
}

const OrderHeader = ({ order, isBudget }: OrderHeaderProps) => {
    const isAssistance = order.orderType === 'assistance';
    const isPickup = order.shipping?.deliveryMethod === 'pickup';
    const headerColor = isBudget 
        ? 'bg-slate-800' 
        : (isAssistance ? 'bg-orange-500' : (isPickup ? 'bg-purple-700' : 'bg-emerald-700'));

    const title = isBudget 
        ? 'ORÇAMENTO / PROPOSTA' 
        : (isAssistance ? 'ORDEM DE SERVIÇO' : (isPickup ? 'PEDIDO DE RETIRADA' : 'PEDIDO DE ENTREGA'));

    return (
        <div className={`flex justify-between items-center p-6 rounded-3xl mb-4 ${headerColor} text-white print-exact-bg shadow-xl`}>
            <div className="flex gap-6 items-center">
                <div className="header-logo-container w-56 h-56 sm:w-64 sm:h-64 bg-white rounded-3xl p-3 shadow-lg flex items-center justify-center shrink-0">
                    <img src={logoMorante} alt="Móveis Morante" className="w-full h-full object-contain rounded-2xl" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter leading-none">MÓVEIS MORANTE</h1>
                    <div className="text-[11px] font-bold opacity-80 uppercase tracking-[0.3em] mt-1.5 ml-1">Qualidade que cabe no seu bolso</div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">
                    {title}
                </div>
                <div className="text-[11px] font-black opacity-90 uppercase tracking-widest flex items-center justify-end gap-2">
                    <i className="bi bi-hash"></i>
                    {formatOrderCode(order)}
                </div>
                <div className="text-[10px] font-bold opacity-75 mt-1 uppercase tracking-tight flex items-center justify-end gap-2">
                    <i className="bi bi-calendar3"></i>
                    EMISSÃO: {formatToBRDate(order.date)}
                </div>
            </div>
        </div>
    );
};

export default OrderHeader;
