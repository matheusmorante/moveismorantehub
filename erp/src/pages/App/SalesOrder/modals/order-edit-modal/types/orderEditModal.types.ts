import type Order from '@/pages/types/order.type';
import type { FiscalOrderEditReplacement } from '@/pages/utils/nfe/orderEditFiscalService';

export interface OrderEditModalProps {
  order?: Order;
  orderId?: string;
  onClose?: () => void;
  onSaveSuccess?: (id?: string, order?: Order) => void;
  /** Abre o formulário diretamente neste step (1=Info, 2=Itens, 3=Cliente, etc.) */
  initialStep?: number;
  /** Se true, destaca visualmente os itens temporários na tabela de itens */
  highlightTemporaryItems?: boolean;
  /** Restringe a edição à conciliação de produtos temporários em pedido atendido. */
  reconciliationMode?: boolean;
}

export interface FiscalReissueState {
  order: Order;
  replacement: FiscalOrderEditReplacement;
  remaining: FiscalOrderEditReplacement[];
}
