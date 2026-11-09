export type SupportCustomerOrderGroup =
  | 'all'
  | 'sales'
  | 'budgets'
  | 'delivery'
  | 'assistance'
  | 'returns';

export interface SupportCustomerOrderPage {
  records: SupportOrderSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SupportOrderSummary {
  id: string;
  orderNumber: string;
  customerName?: string | null;
  status: string; // 'completed', 'active', 'canceled'/'cancelled', etc.
  totalAmount: number;
  paymentMethod?: string | null;
  deliveryStatus?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  deliveryMethod?: string | null;
  deliveryFinishedAt?: string | null;
  assemblyAppointments?: Array<{
    item: string;
    date: string;
    time: string | null;
    type: string;
    status: string;
  }>;
  itemsCount: number;
  itemsPreview: string;
  lineItems?: Array<{ name: string; quantity: number; amount: number | null }>;
  assistanceDescription?: string;
  orderType?: string;
  createdAt: string;
  isCanceled: boolean;
  isCompleted: boolean;
  isActive: boolean;
}

export const SUPPORT_ORDER_QUERY_COLUMNS =
  'id, order_number, status, total_amount, payment_method, delivery_status, scheduled_date, delivery_finished_at, items, created_at';

export const SUPPORT_ORDERS_LOAD_ERROR =
  'Não foi possível carregar os pedidos deste cliente. Tente novamente.';
export const SUPPORT_ORDERS_PERMISSION_ERROR =
  'Você não tem permissão para consultar os pedidos deste cliente.';
