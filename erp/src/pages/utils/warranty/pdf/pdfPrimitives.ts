import type { jsPDF } from 'jspdf';
import { MORANTE_LOGO_BASE64 } from '../moranteLogoBase64';
import {
  COLOR_NAVY,
  COLOR_GOLD,
  COLOR_DARK,
  COLOR_MUTED,
  COLOR_BORDER,
  COLOR_AMBER_ALERT,
  COLOR_AMBER_DARK,
} from './pdfConstants';
import type { PdfRenderContext, SectionParagraph } from './types';

/**
 * Desenha o cabeçalho padronizado das páginas internas (Páginas 2 e 3).
 */
export function drawInternalHeader(doc: jsPDF, pageNumber: number, context: PdfRenderContext): void {
  const { margin, pageWidth, companyInfo, orderCode } = context;

  // Logo Móveis Morante (proporção 1:1 rigorosa, 18x18mm)
  try {
    doc.addImage(MORANTE_LOGO_BASE64, 'PNG', margin, margin, 18, 18);
  } catch {
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MÓVEIS MORANTE', margin, margin + 12);
  }

  // Identificação da loja e dados de contato
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(companyInfo.name.toUpperCase(), margin + 22, margin + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`CNPJ: ${companyInfo.cnpj}  •  WhatsApp: ${companyInfo.phone}`, margin + 22, margin + 10);
  doc.text(companyInfo.address, margin + 22, margin + 14.5);

  // Identificação do Pedido de Venda no cabeçalho
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PEDIDO DE VENDA', pageWidth - margin, margin + 5.5, { align: 'right' });
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.setFontSize(11);
  doc.text(`#${orderCode}`, pageWidth - margin, margin + 12, { align: 'right' });

  // Linha divisória sutil
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, margin + 19, pageWidth - margin, margin + 19);
}

/**
 * Desenha o rodapé das páginas internas com informações institucionais e paginação.
 */
export function drawInternalFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  version: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
): void {
  const footerY = pageHeight - margin - 2;
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('Móveis Morante  •  Cuidando do seu lar com transparência e respeito ao consumidor', margin, footerY);
  doc.text(`Página ${pageNumber} de ${totalPages}  •  Versão ${version}`, pageWidth - margin, footerY, {
    align: 'right',
  });
}

/**
 * Desenha um badge circular numerado estilizado (anel ouro, miolo marinho, número branco).
 */
export function drawNumberedBadge(doc: jsPDF, x: number, y: number, num: string): void {
  // Anel externo amarelo ouro
  doc.setFillColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.circle(x, y, 4, 'F');
  // Círculo interno azul escuro
  doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.circle(x, y, 3.4, 'F');
  // Número em branco centralizado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(num, x, y + 1.1, { align: 'center' });
}

/**
 * Desenha um bloco de tópico numerado com parágrafos regulares ou de alerta.
 */
export function drawSectionBlock(
  doc: jsPDF,
  currentY: number,
  num: string,
  title: string,
  paragraphs: SectionParagraph[],
  contentWidth: number,
  margin: number
): number {
  let yPos = currentY;

  // Badge circular estilizado
  drawNumberedBadge(doc, margin + 4, yPos + 3.2, num);

  // Título do Tópico
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text(title, margin + 10, yPos + 4.2);

  yPos += 7.0;

  paragraphs.forEach((p) => {
    if (p.isAlert) {
      // Bloco de destaque para situações de atenção (ex.: manuseio / salvados)
      doc.setFillColor(COLOR_AMBER_ALERT[0], COLOR_AMBER_ALERT[1], COLOR_AMBER_ALERT[2]);
      doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
      doc.setLineWidth(0.4);
      const alertLines = doc.splitTextToSize(p.text, contentWidth - 12);
      const alertHeight = alertLines.length * 3.1 + (p.subtitle ? 5.8 : 3.2);
      doc.roundedRect(margin + 2, yPos, contentWidth - 4, alertHeight, 1.5, 1.5, 'FD');

      let innerY = yPos + 3.2;
      if (p.subtitle) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.setTextColor(COLOR_AMBER_DARK[0], COLOR_AMBER_DARK[1], COLOR_AMBER_DARK[2]);
        doc.text(p.subtitle, margin + 5, innerY);
        innerY += 3.5;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(COLOR_AMBER_DARK[0], COLOR_AMBER_DARK[1], COLOR_AMBER_DARK[2]);
      doc.text(alertLines, margin + 5, innerY);
      yPos += alertHeight + 2.0;
    } else {
      if (p.subtitle) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
        doc.text(p.subtitle, margin + 4, yPos);
        yPos += 3.3;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.3);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      const lines = doc.splitTextToSize(p.text, contentWidth - 8);
      doc.text(lines, margin + 4, yPos);
      yPos += lines.length * 3.1 + 1.5;
    }
  });

  return yPos + 0.8;
}
