import { ItemsSummary, Item } from './items.type';
import CustomerData from './customerData.type';
import { Payment, PaymentsSummary } from './payments.type';
import Shipping from './Shipping.type';

export type OrderType = 'sale' | 'assistance' | 'showroom' | 'budget' | 'return';
export type ReturnMethod = 'store_delivery' | 'store_collection';

export type AssistanceItem = {
  id: string; // ID for internal keying
  description: string;
  quantity: number;
  originalOrderId: string;
  handlingType?: string;
};

export type Order = {
  fiscalContext?: {
    finalConsumer?: boolean;
    operationType?:
      | 'sale'
      | 'return'
      | 'transfer'
      | 'shipment'
      | 'goods_return'
      | 'export'
      | 'import';
    purpose?: '1' | '2' | '3' | '4';
    requiresTaxCredit?: boolean;
    publicAdministrationRequirement?: boolean;
    otherFiscalRequirement?: boolean;
    presence?: string;
    recipientIeIndicator?: '1' | '2' | '9';
  };
  id?: string;
  orderType?: OrderType;
  status?: string;
  /** Estado físico estruturado da entrega/retirada, mapeado das colunas do pedido. */
  deliveryStatus?: string | null;
  deliveryArrivedAt?: string | null;
  deliveryStartedAt?: string | null;
  deliveryFinishedAt?: string | null;
  pickupConfirmedAt?: string | null;
  items: Item[];
  itemsSummary: ItemsSummary;
  shipping: Shipping;
  seller: string;
  sellerId?: string;
  payments: Payment[];
  paymentsSummary: PaymentsSummary;
  customerData: CustomerData;
  observation: string;
  date: string;
  // Assistance-specific fields
  assistanceDescription?: string;
  assistanceCost?: number; // Custo interno de mão de obra (interno)
  assistanceServiceValue?: number; // Valor cobrado ao cliente pelo serviço
  scheduledDate?: string;
  scheduledTime?: string;
  linkedOrderId?: string | null;
  /** Chave estável para repetir com segurança a criação da devolução enquanto o modal estiver aberto. */
  returnRequestId?: string;
  fiscalReturnAllocations?: Array<{
    returnItemIndex: number;
    originalOrderItemIndex: number;
    originalDocumentId: string;
    originalItemNumber: number;
    quantity: number;
  }>;
  linkedOrderCode?: string;
  collectionObservation?: string;
  assistanceItems?: AssistanceItem[];
  deleted?: boolean;
  deletedAt?: string | null;
  orderIndex?: number;
  orderNumber?: number;
  reviewRequested?: boolean;
  marketingOrigin?: string;
  stockProcessed?: boolean;
  isPartialStockProcessed?: boolean;
  movedProductIds?: string[];
  isRegisteredInBling?: boolean;
  isStockChecked?: boolean;
  isButtonsClicked?: IsButtonsClicked;
  returnOrderId?: string;
  returnKind?: 'partial' | 'complete';
  /** Forma física de retorno; persistida no order_data existente. */
  returnMethod?: ReturnMethod;
  returnStockProcessed?: boolean;
  stockReversed?: boolean;
  returnStockReversed?: boolean;
  autoFulfillExempt?: boolean;
  /** Valor total financeiro da devolução */
  returnedTotalAmount?: number;
  /** Valor total original vendido dos itens da devolução */
  originalSoldTotal?: number;
  /** Estado da entrada de estoque do pedido de devolução vinculado. Usado apenas para consulta na venda original. */
  linkedReturnMovement?: {
    status?: string;
    stockProcessed?: boolean;
    stockReversed?: boolean;
    items?: Item[];
    movedProductIds?: string[];
  };
  nfeData?: {
    accessKey?: string;
    nfeNumber?: number;
    series?: string;
    model?: '55' | '65';
    environment?: 1 | 2;
    protocolNumber?: string;
    protocolDate?: string;
    xml?: string;
    emittedAt?: string;
    status?: 'autorizada' | 'homologada' | 'cancelada' | 'pendente';
  };
};

export type OrderAction =
  | 'PRINT_RECEIPT'
  | 'PRINT_SHIPPING_ORDER'
  | 'PRINT_WARRANTY_TERM'
  | 'SEND_SHIPPING_ORDER'
  | 'SEND_CUSTOMER_ORDER'
  | 'SEND_ASSISTANCE_CUSTOMER'
  | 'SEND_ASSISTANCE_ORDER_DETAILS'
  | 'SEND_ASSISTANCE_OS'
  | 'SEND_CUSTOMER_REVIEWS'
  | 'PRINT_SHIPPING_LABEL'
  | 'PRINT_PRODUCT_LABEL'
  | 'GENERATE_PAYMENT_LINK'
  | 'PRINT_BUDGET'
  | 'SEND_BUDGET'
  | 'SEND_GROUP_INVITE'
  | 'PRINT_ASSISTANCE_OS'
  | 'GENERATE_RETURN'
  | 'UNDO_RETURN'
  | 'PRINT_RETURN_OS'
  | 'DUPLICATE_ORDER'
  | 'GENERATE_SALE_FROM_BUDGET'
  | 'ISSUE_NFE';

/** @deprecated Use OrderAction instead */
export type PdvAction = OrderAction;

export type IsButtonsClicked = {
  printReceipt?: boolean;
  printShippingOrder?: boolean;
  printWarrantyTerm?: boolean;
  sendShippingOrder?: boolean;
  sendCustomerOrder?: boolean;
  sendCustomerReviews?: boolean;
  printShippingLabel?: boolean;
  printProductLabel?: boolean;
  generatePaymentLink?: boolean;
  printBudget?: boolean;
  sendCustomerOrderDetails?: boolean;
  sendAssistanceOS?: boolean;
  sendBudget?: boolean;
  sendGroupInvite?: boolean;
  printAssistanceOS?: boolean;
  generateReturn?: boolean;
  undoReturn?: boolean;
  printReturnOS?: boolean;
  duplicateOrder?: boolean;
  generateSaleFromBudget?: boolean;
  issueNfe?: boolean;
};

export type VisibilitySettings = {
  id: boolean;
  orderDate: boolean;
  deliveryDate: boolean;
  customer: boolean;
  totalValue: boolean;
  status: boolean;
  orderType: boolean;
  labels: boolean;
  actions: boolean;
};

export default Order;
