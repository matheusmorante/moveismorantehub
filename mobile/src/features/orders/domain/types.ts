export type FiscalBadgeStatus = 'not_issued' | 'issued' | 'cancelled' | 'reversed';

export type FiscalOperationBadgeStatus = 'issued' | 'cancelled' | 'rejected' | 'pending';

export type OrderFiscalCancellationState = 'failed' | 'pending' | 'verify';

export interface MobileOrderData extends Record<string, unknown> {
  orderType?: string | null;
  order_type?: string | null;
  orderIndex?: string | null;
  status?: string | null;
  customerData?: { fullName?: string | null; marketingOrigin?: string | null } | null;
  shipping?: { deliveryMethod?: string | null; deliveryType?: string | null } | null;
  deliveryMethod?: string | null;
  deliveryType?: string | null;
}

export interface MobileOrderListItem {
  id: string;
  order_number: string | null;
  created_at: string | null;
  status: string;
  order_type: string;
  customer_name: string;
  total_value: number;
  order_data: MobileOrderData;
  delivery_method?: string | null;
  scheduled_date?: string | null;
  fiscalBadgeStatus?: FiscalBadgeStatus;
  fiscalHmlBadgeStatus?: FiscalBadgeStatus;
  fiscalEstornoBadgeStatus?: FiscalOperationBadgeStatus;
  fiscalDevolucaoBadgeStatus?: FiscalOperationBadgeStatus;
  fiscalDevolucaoCount?: number;
  fiscalCancellationState?: OrderFiscalCancellationState;
  is_stock_checked?: boolean;
  stock_processed?: boolean;
  stock_reversed?: boolean;
  return_order_id?: string | null;
  return_kind?: string | null;
  linked_order_id?: string | null;
  linked_order_code?: string | null;
  version?: number;
}

export interface MobileFiscalBadgeStatuses {
  production: FiscalBadgeStatus;
  homologation?: FiscalBadgeStatus;
  estornoStatus?: FiscalOperationBadgeStatus;
  devolucaoStatus?: FiscalOperationBadgeStatus;
  devolucaoCount?: number;
  fiscalCancellationState?: OrderFiscalCancellationState;
}

export interface FiscalDocumentStatusRow {
  order_id: string | null;
  status: string;
  document_type?: string | null;
  ambiente?: number | null;
}

export type MobileOrderStatusFilter =
  | 'all'
  | 'agendados'
  | 'concluidos'
  | 'cancelados'
  | 'rascunhos'
  | 'retiradas';

export type MobileOrderType = 'sale' | 'budget' | 'assistance' | 'return';

export interface OrderPresentationInput {
  status?: string | null;
  orderType?: string | null;
  order_type?: string | null;
  deliveryMethod?: string | null;
  delivery_method?: string | null;
  shipping?: { deliveryMethod?: string | null } | null;
  returnMethod?: string | null;
  order_data?: {
    orderType?: string | null;
    order_type?: string | null;
    deliveryMethod?: string | null;
    delivery_method?: string | null;
    shipping?: { deliveryMethod?: string | null } | null;
    returnMethod?: string | null;
  } | null;
}
