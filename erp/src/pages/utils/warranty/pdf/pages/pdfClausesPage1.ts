import type { PdfRenderContext, SectionParagraph } from '../types';
import { WARRANTY_TOPICS_PAGE_2 } from '../../warrantyLegalContent';
import {
  COLOR_NAVY,
  COLOR_DARK,
  COLOR_MUTED,
  COLOR_BORDER,
  COLOR_BG_LIGHT,
  PDF_TOTAL_PAGES,
} from '../pdfConstants';
import {
  drawInternalHeader,
  drawInternalFooter,
  drawSectionBlock,
} from '../pdfPrimitives';

/**
 * Renderiza a Página 2: Dados do Cliente, Itens Comprados e Tópicos 1 a 4 do Termo de Garantia.
 */
export function renderPdfClausesPage1(context: PdfRenderContext): void {
  const {
    doc,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    customerName,
    purchaseDate,
    customerDoc,
    customerPhone,
    items,
    version,
  } = context;

  doc.addPage('a4', 'portrait');
  drawInternalHeader(doc, 2, context);

  let y = margin + 24;

  // 1. Box: Dados do Cliente e Identificação da Compra
  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text(`Cliente: ${customerName}`, margin + 4, y + 4.2);
  doc.text(`Data do Pedido: ${purchaseDate}`, margin + 105, y + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`CPF/CNPJ: ${customerDoc}`, margin + 4, y + 9.0);
  doc.text(`Contato: ${customerPhone}`, margin + 105, y + 9.0);

  y += 15.0;

  // 2. Tabela: Relação dos Móveis Adquiridos
  doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.rect(margin, y, contentWidth, 4.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(255, 255, 255);
  doc.text('RELAÇÃO DOS MÓVEIS ADQUIRIDOS NESTE PEDIDO', margin + 4, y + 3.4);
  doc.text('QTD', pageWidth - margin - 14, y + 3.4, { align: 'center' });

  y += 4.8;

  const maxItemsToShow = Math.min(items.length, 3);
  if (items.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 4.8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text('Móveis descritos no pedido original de venda.', margin + 4, y + 3.3);
    y += 5.5;
  } else {
    for (let i = 0; i < maxItemsToShow; i++) {
      const it = items[i];
      const isEven = i % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.rect(margin, y, contentWidth, 4.2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.9);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      const desc = it.description || 'Produto';
      const truncatedDesc = desc.length > 78 ? `${desc.substring(0, 75)}...` : desc;
      doc.text(truncatedDesc, margin + 4, y + 2.9);

      doc.setFont('helvetica', 'normal');
      doc.text(`${it.quantity} un`, pageWidth - margin - 14, y + 2.9, { align: 'center' });
      y += 4.2;
    }

    if (items.length > maxItemsToShow) {
      doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
      doc.rect(margin, y, contentWidth, 3.8, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      doc.text(
        `... e mais ${items.length - maxItemsToShow} item(ns) constantes no pedido original.`,
        margin + 4,
        y + 2.7
      );
      y += 3.8;
    }
  }

  y += 2.5;

  // 3. Tópicos 1 a 4 (Página 2)
  WARRANTY_TOPICS_PAGE_2.forEach((sec) => {
    const paragraphs: SectionParagraph[] = [];
    if (sec.alert) {
      paragraphs.push({
        subtitle: sec.alert.title,
        text: sec.alert.text,
        isAlert: true,
      });
    }
    if (sec.text) {
      paragraphs.push({ text: sec.text });
    }
    if (sec.paragraphs) {
      sec.paragraphs.forEach((p) => {
        paragraphs.push({ subtitle: p.subtitle, text: p.text });
      });
    }
    y = drawSectionBlock(doc, y, sec.number, sec.title.toUpperCase(), paragraphs, contentWidth, margin);
  });

  drawInternalFooter(doc, 2, PDF_TOTAL_PAGES, version, pageWidth, pageHeight, margin);
}
