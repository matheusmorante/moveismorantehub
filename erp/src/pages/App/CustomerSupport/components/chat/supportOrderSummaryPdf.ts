import {
  formatBRL,
  formatDate,
  type SupportOrderSummary,
} from '@/pages/utils/customerSupport/supportOrdersService';

export const formatSupportOrderMoney = (value: number) => formatBRL(Number.isFinite(value) ? value : 0);

export const isQuoteOrder = (order: SupportOrderSummary) =>
  order.orderType === 'budget' || /quoted|budget|orçamento|orcamento/i.test(order.status || '');

export async function createOrderSummaryPdf(order: SupportOrderSummary, customerName: string, companyName: string) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const quote = isQuoteOrder(order);
  const documentTitle = quote ? 'Resumo de orçamento' : 'Resumo de pedido';
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(15, 118, 110);
  pdf.roundedRect(14, 14, pageWidth - 28, 30, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text(companyName || 'Móveis Morante', 20, 26);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(documentTitle, 20, 37);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(`${quote ? 'Orçamento' : 'Pedido'} #${order.orderNumber}`, 16, 58);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const rows = [
    `Cliente: ${customerName}`,
    `Data: ${formatDate(order.createdAt)}`,
    `Status: ${order.status || 'Em andamento'}`,
    `Itens: ${order.itemsCount}`,
    `Resumo: ${order.itemsPreview}`,
  ];
  pdf.text(pdf.splitTextToSize(rows.join('\n'), pageWidth - 32), 16, 70);
  pdf.setDrawColor(226, 232, 240);
  pdf.line(16, 126, pageWidth - 16, 126);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(15, 118, 110);
  pdf.text(`Total: ${formatSupportOrderMoney(order.totalAmount)}`, 16, 140);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Documento de consulta gerado pela Central de Atendimento.', 16, 153);
  return pdf.output('blob') as Blob;
}
