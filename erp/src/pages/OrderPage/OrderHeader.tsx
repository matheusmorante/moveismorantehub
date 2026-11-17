import { formatToBRDate } from '../utils/formatters';
import { formatOrderCode } from '../utils/orderCode';
import logoMorante from '../../assets/logo-morante.svg';

interface OrderHeaderProps {
  order: any;
  isBudget: boolean;
}

const HEADER_THEMES = {
  budget: {
    title: 'ORÇAMENTO / PROPOSTA',
    colorHex: '#1e293b',
  },
  assistance: {
    title: 'ORDEM DE SERVIÇO',
    colorHex: '#f97316',
  },
  pickup: {
    title: 'PEDIDO DE RETIRADA',
    colorHex: '#7e22ce',
  },
  delivery: {
    title: 'PEDIDO DE ENTREGA',
    colorHex: '#047857',
  },
  sale: {
    title: 'INFORMAÇÕES SOBRE A VENDA',
    colorHex: '#2563eb',
  },
} as const;

const OrderHeader = ({ order, isBudget }: OrderHeaderProps) => {
  const isAssistance = order?.orderType === 'assistance';
  const isSale = order?.orderType === 'sale' || order?.orderType === 'showroom';
  const isPickup = order?.shipping?.deliveryMethod === 'pickup';
  const showResponsible = Boolean(order?.operationContext || isSale);

  const theme = isBudget
    ? HEADER_THEMES.budget
    : isAssistance
      ? HEADER_THEMES.assistance
      : order?.operationContext
        ? isPickup ? HEADER_THEMES.pickup : HEADER_THEMES.delivery
        : isSale
          ? HEADER_THEMES.sale
          : isPickup
            ? HEADER_THEMES.pickup
            : HEADER_THEMES.delivery;
  const title = order?.operationContext
    ? `INFORMAÇÕES SOBRE A ${isPickup ? 'RETIRADA' : 'ENTREGA'}`
    : theme.title;

  const backgroundGradient = `linear-gradient(to right, #ffffff 0%, #ffffff 24%, ${theme.colorHex} 40%, ${theme.colorHex} 100%)`;

  return (
    <div
      className="order-print-header flex justify-between items-center px-3 py-1.5 rounded-xl mb-1.5 text-white print-exact-bg overflow-hidden"
      style={{
        background: backgroundGradient,
      }}
    >
      <div className="flex items-center">
        <div className="header-logo-container w-48 h-24 border-0 shadow-none flex items-center justify-start shrink-0">
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
        {showResponsible && (
          <div className="text-[9px] sm:text-[10px] font-bold opacity-90 uppercase tracking-wide mb-0.5">
            Responsável: {order?.seller || 'Não informado'}
          </div>
        )}
        {order?.operationContext && (
          <div className="text-[9px] sm:text-[10px] font-black opacity-90 uppercase tracking-wider mb-0.5">
            Operação {order.operationContext.operationNumber}/{order.operationContext.operationCount}
          </div>
        )}
        <div className="text-[10px] sm:text-[11px] font-black opacity-90 uppercase tracking-wider flex items-center justify-end gap-1.5">
          <i className="bi bi-hash"></i>
          {formatOrderCode(order)}
        </div>
        <div className="text-[9px] sm:text-[10px] font-bold opacity-75 mt-0.5 uppercase tracking-tight flex items-center justify-end gap-1.5">
          <i className="bi bi-calendar3"></i>
          EMISSÃO: {formatToBRDate(order?.date)}
        </div>
      </div>
    </div>
  );
};

export default OrderHeader;
