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
  doc.circle(x, y, 3.2, 'F');
  // Círculo interno azul escuro
  doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.circle(x, y, 2.7, 'F');
  // Número em branco centralizado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(255, 255, 255);
  doc.text(num, x, y + 0.9, { align: 'center' });
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

  // Badge circular estilizado posicionado sem sobrepor o texto
  drawNumberedBadge(doc, margin + 3.5, yPos + 2.5, num);

  // Título do Tópico (com quebra automática e margem à direita do badge)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  const titleLines = doc.splitTextToSize(title, contentWidth - 12);
  doc.text(titleLines, margin + 9.5, yPos + 3.2);

  yPos += Math.max(6.2, titleLines.length * 3.3 + 2.2);

  paragraphs.forEach((p) => {
    if (p.isAlert) {
      // Bloco de destaque para situações de atenção (ex.: manuseio / salvados)
      yPos += 1.5; // Respiro superior antes do box amarelo

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      const subLines = p.subtitle ? doc.splitTextToSize(p.subtitle, contentWidth - 14) : [];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      const alertLines = doc.splitTextToSize(p.text, contentWidth - 14);

      const subtitleHeight = subLines.length > 0 ? subLines.length * 3.2 + 1.5 : 0;
      const bodyHeight = alertLines.length * 2.85;
      const paddingY = 3.2;
      const alertHeight = paddingY * 2 + subtitleHeight + bodyHeight;

      doc.setFillColor(COLOR_AMBER_ALERT[0], COLOR_AMBER_ALERT[1], COLOR_AMBER_ALERT[2]);
      doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin + 2, yPos, contentWidth - 4, alertHeight, 1.5, 1.5, 'FD');

      let innerY = yPos + paddingY + 2.0;
      if (subLines.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(COLOR_AMBER_DARK[0], COLOR_AMBER_DARK[1], COLOR_AMBER_DARK[2]);
        doc.text(subLines, margin + 6, innerY);
        innerY += subtitleHeight;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(COLOR_AMBER_DARK[0], COLOR_AMBER_DARK[1], COLOR_AMBER_DARK[2]);
      doc.text(alertLines, margin + 6, innerY);

      yPos += alertHeight + 3.8; // Respiro inferior generoso para nunca sobrepor o parágrafo seguinte
    } else {
      if (p.subtitle) {
        yPos += 1.8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.3);
        doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
        const subLines = doc.splitTextToSize(p.subtitle, contentWidth - 10);
        doc.text(subLines, margin + 5, yPos);
        yPos += subLines.length * 3.0 + 0.8;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
      const lines = doc.splitTextToSize(p.text, contentWidth - 10);
      doc.text(lines, margin + 5, yPos);
      yPos += lines.length * 2.85 + 1.8;
    }
  });

  return yPos + 0.8;
}
