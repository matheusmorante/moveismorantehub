import Order, { OrderAction, IsButtonsClicked } from "../../../types/order.type";
import { toast } from "react-toastify";

import { 
    shippingOrderWhatsappUrl, 
    customerOrderWhatsappUrl, 
    customerReviewsWhatsappUrl, 
    assistanceCustomerWhatsappUrl,
    sendDirectShippingMessage,
    sendDirectCustomerMessage,
    sendDirectAssistanceMessage
} from "../../../utils/whatsapp";

export const actionsMap: Record<OrderAction, (order: Order) => void> = {
    'PRINT_RECEIPT': (order) => {
        if (!order.seller) {
            toast.error("Vendedor obrigatório para imprimir recibo.");
            return;
        }
        sessionStorage.setItem('order', JSON.stringify(order));
        window.open('/receipt', '_blank');
    },
    'PRINT_SHIPPING_ORDER': (order) => {
        if (!order.seller) {
            toast.error("Vendedor obrigatório para imprimir o pedido.");
            return;
        }
        sessionStorage.setItem("order", JSON.stringify(order));
        window.open("/order", "_blank");
    },
    'PRINT_WARRANTY_TERM': (order) => {
        console.log("Gerando Termo de Garantia para o pedido:", order.id);
    },
    'SEND_SHIPPING_ORDER': (order) => {
        sendDirectShippingMessage(order);
    },
    'SEND_CUSTOMER_ORDER': (order) => {
        sendDirectCustomerMessage(order);
    },
    'SEND_ASSISTANCE_CUSTOMER': (order) => {
        sendDirectAssistanceMessage(order);
    },
    'SEND_CUSTOMER_REVIEWS': (order) => {
        window.open(customerReviewsWhatsappUrl(order), "_blank");
    },
    'PRINT_SHIPPING_LABEL': (order) => {
        sessionStorage.setItem("order", JSON.stringify(order));
        window.open("/shipping-label", "_blank");
    },
    'PRINT_PRODUCT_LABEL': (order) => {
        const item = order.items?.[0];
        const url = item?.productId 
            ? `/stock/label-printing?preset=qr_product&productId=${item.productId}` 
            : `/stock/label-printing?preset=qr_product`;
        window.open(url, "_blank");
    },
    'GENERATE_PAYMENT_LINK': (order) => {
        console.log("Gerando link de pagamento para o pedido:", order.id);
    }
};

export interface OrderButton {
    key: keyof IsButtonsClicked;
    icon: string;
    action: OrderAction;
    label: string;
    color: string;
    tooltip: string;
    // Optional: which orderTypes this button applies to. If absent = all types.
    orderTypes?: string[];
}

export const buttons: OrderButton[] = [
    {
        key: "printShippingOrder",
        icon: "bi-printer-fill",
        action: "PRINT_SHIPPING_ORDER",
        label: "Imprimir Pedido",
        color: "text-blue-600 hover:bg-blue-50",
        tooltip: "Imprimir Pedido de Venda",
        orderTypes: ['sale']  // Não aparece para assistência
    },
    {
        key: "printReceipt",
        icon: "bi-receipt",
        action: "PRINT_RECEIPT",
        label: "Imprimir Recibo",
        color: "text-slate-600 hover:bg-slate-50",
        tooltip: "Gerar Recibo do Cliente",
        orderTypes: ['sale']  // Não aparece para assistência
    },
    {
        key: "sendShippingOrder",
        icon: "bi-truck",
        action: "SEND_SHIPPING_ORDER",
        label: "Enviar Entrega",
        color: "text-orange-500 hover:bg-orange-50",
        tooltip: "Enviar detalhes da entrega via WhatsApp",
        orderTypes: ['sale']  // Não aparece para assistência
    },
    {
        key: "sendCustomerOrder",
        icon: "bi-whatsapp",
        action: "SEND_CUSTOMER_ORDER",
        label: "WhatsApp Cliente",
        color: "text-green-600 hover:bg-green-50",
        tooltip: "Enviar confirmação do pedido para o cliente",
        orderTypes: ['sale']
    },
    {
        key: "sendCustomerOrder",  // reuse key for assistance
        icon: "bi-whatsapp",
        action: "SEND_ASSISTANCE_CUSTOMER",
        label: "Confirmar Assistência",
        color: "text-green-600 hover:bg-green-50",
        tooltip: "Enviar confirmação da assistência técnica ao cliente via WhatsApp",
        orderTypes: ['assistance']
    },
    {
        key: "sendCustomerReviews",
        icon: "bi-star-fill",
        action: "SEND_CUSTOMER_REVIEWS",
        label: "Enviar Avaliação",
        color: "text-yellow-500 hover:bg-yellow-50",
        tooltip: "Enviar pedido de avaliação da loja no Google Maps"
        // All order types
    },
];
