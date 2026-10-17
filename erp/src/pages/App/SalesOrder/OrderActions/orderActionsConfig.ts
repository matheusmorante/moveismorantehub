import Order, { OrderAction } from '../../../types/order.type';
import { toast } from 'react-toastify';
import {
  customerReviewsWhatsappUrl,
  assistanceServiceOrderWhatsappUrl,
  sendDirectShippingMessage,
  sendDirectCustomerMessage,
  sendDirectAssistanceMessage,
  sendDirectAssistanceOrderDetailsMessage,
  sendDirectBudgetMessage,
  sendDirectGroupInviteMessage,
  sendDirectReturnOSCustomerMessage,
  sendDirectReturnOSTeamMessage,
  sendDirectCustomerOrderViaMetaApi,
} from '../../../utils/whatsapp';
import { printSalesOrder, printReceipt } from '../../../utils/printing/printService';
import { printAssistanceServiceOrder } from './printers/printAssistanceOs';
import { printReturnServiceOrder } from './printers/printReturnOs';

export { buttons, type OrderButton } from './orderButtonsConfig';

/**
 * Mapa central de roteamento e despacho de ações pós-pedido.
 * Cada ação é delegada para o seu respectivo módulo de negócio de alta coesão.
 */
export const actionsMap: Record<OrderAction, (order: Order) => void> = {
  PRINT_RECEIPT: (order) => {
    printReceipt(order);
  },
  PRINT_PROMISSORY_NOTE: (order) => {
    sessionStorage.setItem('order', JSON.stringify(order));
    window.open('/promissory-note', '_blank');
  },
  PRINT_SHIPPING_ORDER: (order) => {
    printSalesOrder(order);
  },
  PRINT_WARRANTY_TERM: (order) => {
    void (async () => {
      try {
        const { generateAndSaveWarrantyTerm, printWarrantyTermDocument } = await import(
          '@/pages/utils/warranty/warrantyTermService'
        );
        const { generatedPdf } = await generateAndSaveWarrantyTerm(order);
        printWarrantyTermDocument(generatedPdf.pdfUrl);
      } catch (err: any) {
        toast.error(err.message || 'Erro ao gerar Termo de Garantia.');
      }
    })();
  },
  SEND_SHIPPING_ORDER: (order) => {
    sendDirectShippingMessage(order);
  },
  SEND_CUSTOMER_ORDER: (order) => {
    sendDirectCustomerMessage(order);
  },
  SEND_CUSTOMER_ORDER_DIRECT_API: (order) => {
    void sendDirectCustomerOrderViaMetaApi(order);
  },
  SEND_ASSISTANCE_CUSTOMER: (order) => {
    sendDirectAssistanceMessage(order);
  },
  SEND_ASSISTANCE_ORDER_DETAILS: (order) => {
    sendDirectAssistanceOrderDetailsMessage(order);
  },
  SEND_ASSISTANCE_OS: (order) => {
    window.open(assistanceServiceOrderWhatsappUrl(order), '_blank');
  },
  SEND_RETURN_OS_CUSTOMER: (order) => {
    void sendDirectReturnOSCustomerMessage(order);
  },
  SEND_RETURN_OS_TEAM: (order) => {
    void sendDirectReturnOSTeamMessage(order);
  },
  SEND_CUSTOMER_REVIEWS: (order) => {
    window.open(customerReviewsWhatsappUrl(order), '_blank');
  },
  PRINT_SHIPPING_LABEL: (order) => {
    sessionStorage.setItem('order', JSON.stringify(order));
    window.open('/shipping-label', '_blank');
  },
  PRINT_PRODUCT_LABEL: (order) => {
    const item = order.items?.[0];
    const url = item?.productId
      ? `/estoque/etiquetas?preset=qr_product&productId=${item.productId}`
      : `/estoque/etiquetas?preset=qr_product`;
    window.open(url, '_blank');
  },
  GENERATE_PAYMENT_LINK: (order) => {
    console.log('Gerando link de pagamento para o pedido:', order.id);
  },
  PRINT_BUDGET: (order) => {
    sessionStorage.setItem('order', JSON.stringify(order));
    window.open('/order?type=budget', '_blank');
  },
  SEND_BUDGET: (order) => {
    sendDirectBudgetMessage(order);
  },
  SEND_GROUP_INVITE: (order) => {
    sendDirectGroupInviteMessage(order);
  },
  PRINT_ASSISTANCE_OS: (order) => {
    printAssistanceServiceOrder(order);
  },
  GENERATE_RETURN: (order) => {
    console.log('Iniciando fluxo de devolução para o pedido:', order.id);
  },
  GENERATE_ASSISTANCE: (order) => {
    console.log('Iniciando fluxo de assistência para o pedido:', order.id);
  },
  PRINT_RETURN_OS: (order) => {
    printReturnServiceOrder(order);
  },
  UNDO_RETURN: async (order) => {
    console.log('Cancelando devolução para o pedido:', order.id);
  },
  DUPLICATE_ORDER: (order) => {
    console.log('Iniciando fluxo de duplicação para o pedido:', order.id);
  },
  GENERATE_SALE_FROM_BUDGET: (order) => {
    console.log('Gerando venda a partir de orçamento:', order.id);
  },
  ISSUE_NFE: (order) => {
    console.log('Abrindo modal de emissão fiscal para o pedido:', order.id);
  },
};
