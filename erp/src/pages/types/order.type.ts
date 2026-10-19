import type CustomerData from './customerData.type';
import type { Item, ItemsSummary } from './items.type';
import type { FiscalInfo } from './product.type';
import type { Payment, PaymentsSummary } from './payments.type';
import type Shipping from './Shipping.type';

export type OrderType = 'sale' | 'assistance' | 'showroom' | 'budget' | 'return';
export type ReturnMethod = 'store_delivery' | 'store_collection';
export type ReturnPaymentMethod = 'Estorno de crédito' | 'Pix' | 'Dinheiro';
export type FiscalAcquisitionPurpose = 'resale' | 'use_consumption' | 'fixed_asset';

export type AssistanceItem = {
  id: string; // ID for internal keying
  description: string;
  quantity: number;
  originalOrderId: string;
  handlingType?: string;
  observation?: string;
};

export type Order = {
  /** Marcador de rastreabilidade exclusivo de pedidos sintéticos de teste. */
  syntheticFixture?: { scenarioKey: string; version: 1; payloadHash?: string };
  /** Marcador explícito do domínio já persistido em order_data.is_test. */
  is_test?: boolean;
  testArtifact?: { is_test: true; runId: string; ownerId: string; scenarioKey?: string } | null;
  fiscalContext?: {
    acquisitionPurpose?: FiscalAcquisitionPurpose;
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
  /** Versão da linha no banco, usada para proteger atualizações transacionais. */
  updatedAt?: string;
  orderType?: OrderType;
  status?: string;
  /** Estado físico estruturado da entrega/retirada, mapeado das colunas do pedido. */
  deliveryStatus?: string | null;
  deliveryArrivedAt?: string | null;
  deliveryStartedAt?: string | null;
  deliveryFinishedAt?: string | null;
  pickupConfirmedAt?: string | null;
  /** Responsáveis pela entrega do pedido (operador e ajudantes). */
  deliveryResponsibles?: Array<{ id?: string; name: string; role?: string }>;
  deliveryResponsibleName?: string | null;
  deliveryResponsibleId?: string | null;
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
  inventoryMovementNote?: string;
  isPartialStockProcessed?: boolean;
  movedProductIds?: string[];
  isRegisteredInBling?: boolean;
  isStockChecked?: boolean;
  isButtonsClicked?: IsButtonsClicked;
  returnOrderId?: string;
  returnKind?: 'partial' | 'complete';
  /** Forma física de retorno; persistida no order_data existente. */
  returnMethod?: ReturnMethod;
  /** Forma escolhida para estornar o pagamento de uma devolução comercial avulsa. */
  returnPaymentMethod?: ReturnPaymentMethod;
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
    /** Derived only from linked receipts; does not overwrite the persisted sale snapshot. */
    returnKind?: 'complete' | 'partial';
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
  /** Fiscal fields edited in the emission modal, kept apart from the sale-item snapshot. */
  nfeDraft?: Partial<Record<'1' | '2', {
    items: Array<{
      orderItemId?: string;
      productId?: string;
      variationId?: string;
      fiscal: Partial<FiscalInfo> & { csosnSource?: string };
    }>;
  }>>;
};

export type OrderAction =
  | 'PRINT_RECEIPT'
  | 'PRINT_PROMISSORY_NOTE'
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
  | 'GENERATE_ASSISTANCE'
  | 'UNDO_RETURN'
  | 'PRINT_RETURN_OS'
  | 'SEND_RETURN_OS_CUSTOMER'
  | 'SEND_RETURN_OS_TEAM'
  | 'DUPLICATE_ORDER'
  | 'GENERATE_SALE_FROM_BUDGET'
  | 'ISSUE_NFE'
  | 'SEND_CUSTOMER_ORDER_DIRECT_API';

/** @deprecated Use OrderAction instead */
export type PdvAction = OrderAction;

export type IsButtonsClicked = {
  printReceipt?: boolean;
  printPromissoryNote?: boolean;
  printShippingOrder?: boolean;
  printWarrantyTerm?: boolean;
  sendShippingOrder?: boolean;
  sendCustomerOrder?: boolean;
  sendCustomerOrderDirectApi?: boolean;
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
  generateAssistance?: boolean;
  undoReturn?: boolean;
  printReturnOS?: boolean;
  sendReturnOSCustomer?: boolean;
  sendReturnOSTeam?: boolean;
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
