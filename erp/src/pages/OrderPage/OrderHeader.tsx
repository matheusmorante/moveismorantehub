import { formatToBRDate } from '../utils/formatters';
import { formatOrderCode } from '../utils/orderCode';
import logoMorante from '../../assets/logo-morante-horizontal.svg';

interface OrderHeaderProps {
  order: any;
  isBudget: boolean;
}

const OrderHeader = ({ order, isBudget }: OrderHeaderProps) => {
  const isAssistance = order.orderType === 'assistance';
  const isPickup = order.shipping?.deliveryMethod === 'pickup';
  const headerColor = isBudget
    ? 'bg-slate-800'
    : isAssistance
      ? 'bg-orange-500'
      : isPickup
        ? 'bg-purple-700'
        : 'bg-emerald-700';

  const title = isBudget
    ? 'ORÇAMENTO / PROPOSTA'
    : isAssistance
      ? 'ORDEM DE SERVIÇO'
      : isPickup
        ? 'PEDIDO DE RETIRADA'
        : 'PEDIDO DE ENTREGA';

  return (
    <div
      className={`order-print-header flex justify-between items-center px-3 py-1.5 rounded-xl mb-1.5 ${headerColor} text-white print-exact-bg shadow-sm`}
    >
      <div className="flex items-center">
        <div className="header-logo-container w-44 sm:w-48 h-12 sm:h-13 bg-white rounded-lg p-1 border-0 shadow-none flex items-center justify-center shrink-0">
          <img
            src={logoMorante}
            alt="Móveis Morante"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none mb-0.5">
          {title}
        </div>
        <div className="text-[10px] sm:text-[11px] font-black opacity-90 uppercase tracking-wider flex items-center justify-end gap-1.5">
          <i className="bi bi-hash"></i>
          {formatOrderCode(order)}
        </div>
        <div className="text-[9px] sm:text-[10px] font-bold opacity-75 mt-0.5 uppercase tracking-tight flex items-center justify-end gap-1.5">
          <i className="bi bi-calendar3"></i>
          EMISSÃO: {formatToBRDate(order.date)}
        </div>
      </div>
    </div>
  );
};

export default OrderHeader;
