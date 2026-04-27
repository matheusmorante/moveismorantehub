import { ItemsSummary, Item } from "./items.type";
import CustomerData from "./customerData.type";
import { Payment, PaymentsSummary } from "./payments.type";
import Shipping from "./Shipping.type";

export type OrderType = 'sale' | 'assistance' | 'showroom' | 'budget' | 'return';

export type AssistanceItem = {
    id: string; // ID for internal keying
    description: string;
    quantity: number;
    originalOrderId: string;
    handlingType?: string;
}

export type Order = {
    id?: string,
    orderType?: OrderType,
    status?: string,
    items: Item[],
    itemsSummary: ItemsSummary,
    shipping: Shipping,
    seller: string,
    payments: Payment[],
    paymentsSummary: PaymentsSummary
    customerData: CustomerData,
    observation: string,
    date: string,
    // Assistance-specific fields
    assistanceDescription?: string,
    assistanceCost?: number,        // Custo interno de mão de obra (interno)
    assistanceServiceValue?: number, // Valor cobrado ao cliente pelo serviço
    scheduledDate?: string,
    scheduledTime?: string,
    linkedOrderId?: string | null,
    assistanceItems?: AssistanceItem[],
    deleted?: boolean,
    deletedAt?: string | null,
    orderIndex?: number,
    reviewRequested?: boolean,
    marketingOrigin?: string,
    stockProcessed?: boolean,
    isRegisteredInBling?: boolean,
    isButtonsClicked?: IsButtonsClicked,
    returnOrderId?: string
}

export type OrderAction =
    'PRINT_RECEIPT' |
    'PRINT_SHIPPING_ORDER' |
    'PRINT_WARRANTY_TERM' |
    'SEND_SHIPPING_ORDER' |
    'SEND_CUSTOMER_ORDER' |
    'SEND_ASSISTANCE_CUSTOMER' |
    'SEND_ASSISTANCE_ORDER_DETAILS' |
    'SEND_ASSISTANCE_OS' |
    'SEND_CUSTOMER_REVIEWS' |
    'PRINT_SHIPPING_LABEL' |
    'PRINT_PRODUCT_LABEL' |
    'GENERATE_PAYMENT_LINK' |
    'PRINT_BUDGET' |
    'SEND_BUDGET' |
    'SEND_GROUP_INVITE' |
    'PRINT_ASSISTANCE_OS' |
    'GENERATE_RETURN' |
    'UNDO_RETURN' |
    'PRINT_RETURN_OS'

/** @deprecated Use OrderAction instead */
export type PdvAction = OrderAction;

export type IsButtonsClicked = {
    printReceipt: boolean,
    printShippingOrder: boolean,
    printWarrantyTerm: boolean,
    sendShippingOrder: boolean,
    sendCustomerOrder: boolean,
    sendCustomerReviews: boolean,
    printShippingLabel: boolean,
    printProductLabel: boolean,
    generatePaymentLink: boolean,
    printBudget: boolean,
    sendCustomerOrderDetails: boolean,
    sendAssistanceOS: boolean,
    sendBudget: boolean,
    sendGroupInvite: boolean,
    printAssistanceOS: boolean,
    generateReturn: boolean,
    undoReturn: boolean,
    printReturnOS: boolean
}

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
