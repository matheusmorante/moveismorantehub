import type Order from '@/pages/types/order.type';
import { toast } from 'react-toastify';
import type { DanfeData } from '../nfe/danfeGenerator';
import { executePrintFallback } from './printFallbackHandler';
import { buildDanfeHtml } from './printHtmlBuilder';
import type { PrintJobResult } from './print.types';

/** Abre o pedido na visualização do navegador para impressão. */
export const printSalesOrder = async (order: Order): Promise<PrintJobResult> => {
  if (!order.seller) {
    toast.error('Atendente obrigatório para imprimir o pedido.');
    return { success: false, status: 'error', message: 'Atendente não informado' };
  }

  return executePrintFallback('sales_order', order);
};

/** Abre o recibo na visualização do navegador para impressão. */
export const printReceipt = async (order: Order): Promise<PrintJobResult> => {
  if (!order.seller) {
    toast.error('Atendente obrigatório para imprimir recibo.');
    return { success: false, status: 'error', message: 'Atendente não informado' };
  }

  if (
    !order.customerData?.fullName ||
    order.customerData.fullName === 'Nenhum' ||
    order.customerData.fullName === 'Ao Consumidor'
  ) {
    toast.error('Não é possível imprimir o recibo para pedidos sem cliente associado.');
    return { success: false, status: 'error', message: 'Cliente não informado' };
  }

  return executePrintFallback('receipt', order);
};

/** Abre o DANFE no navegador para impressão. */
export const printDanfe = async (danfeData: DanfeData): Promise<PrintJobResult> => {
  return executePrintFallback('danfe', danfeData.order, buildDanfeHtml(danfeData));
};

/** Abre a janela padrão do navegador para os demais documentos. */
export const printConventional = (
  type: 'sales_order' | 'receipt' | 'danfe',
  order?: Order,
  html?: string
): PrintJobResult => executePrintFallback(type, order, html);

export default {
  printSalesOrder,
  printReceipt,
  printDanfe,
  printConventional,
};
