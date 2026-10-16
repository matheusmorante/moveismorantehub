import type { PdfRenderContext, SectionParagraph } from '../types';
import { WARRANTY_TOPICS_PAGE_3 } from '../../warrantyLegalContent';
import {
  COLOR_NAVY,
  COLOR_GOLD,
  COLOR_DARK,
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
 * Renderiza a Página 3: Tópicos 5 a 9 e Card de Canais Oficiais de Atendimento.
 * A identificação institucional e o carimbo com QR code ficam exclusivamente na Capa (Página 1).
 */
export function renderPdfClausesPage2(context: PdfRenderContext): void {
  const {
    doc,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    companyInfo,
    version,
  } = context;

  doc.addPage('a4', 'portrait');
  drawInternalHeader(doc, 3, context);

  let y = margin + 24;

  // 1. Tópicos 5 a 9 (Página 3)
  WARRANTY_TOPICS_PAGE_3.forEach((sec) => {
    const paragraphs: SectionParagraph[] = [];
    if (sec.alert) {
      paragraphs.push({
        subtitle: sec.alert.title,
        text: sec.alert.text,
        isAlert: true,
      });
    }
    if (sec.text) {
      const formattedText = sec.text.replace('(41) 99749-3547', companyInfo.phone);
      paragraphs.push({ text: formattedText });
    }
    if (sec.paragraphs) {
      sec.paragraphs.forEach((p) => {
        paragraphs.push({ subtitle: p.subtitle, text: p.text });
      });
    }
    y = drawSectionBlock(doc, y, sec.number, sec.title.toUpperCase(), paragraphs, contentWidth, margin);
  });

  // 2. Área Final: Canais Oficiais de Atendimento (exclusivamente dados de contato, horário e endereço)
  const contactBoxH = 34;
  const contactY = Math.max(y + 2, pageHeight - margin - contactBoxH - 8);

  doc.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, contactY, contentWidth, contactBoxH, 2, 2, 'FD');

  // Faixa superior do card de contato em Azul Escuro com friso Amarelo Ouro
  doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.rect(margin, contactY, contentWidth, 5.5, 'F');
  doc.setFillColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.rect(margin, contactY + 5.0, contentWidth, 0.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    'CANAIS OFICIAIS DE ATENDIMENTO',
    margin + 5,
    contactY + 3.8
  );

  // Mensagem acolhedora de suporte
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(
    'Nossa equipe está sempre à disposição para orientar, tirar dúvidas e oferecer o melhor suporte para o seu lar.',
    margin + 5,
    contactY + 9.5
  );

  // Grid com dados reais da loja Móveis Morante
  const callPhone = companyInfo.telephoneCall || '(41) 99224-4631';
  const whatsappPhone = companyInfo.phone || '(41) 99749-3547';
  const hours = companyInfo.openingHours || 'Seg-Sex: 8h às 18h | Sáb: 8h às 13h';

  // Linha 1: Telefones
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('WhatsApp Oficial:', margin + 5, contactY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(whatsappPhone, margin + 30, contactY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('Telefone p/ Ligação:', margin + 65, contactY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(callPhone, margin + 92, contactY + 16);

  // Linha 2: Horário de Atendimento e Endereço
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('Horário:', margin + 5, contactY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(hours, margin + 30, contactY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('Endereço:', margin + 5, contactY + 27.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(companyInfo.address, margin + 30, contactY + 27.5);

  drawInternalFooter(doc, 3, PDF_TOTAL_PAGES, version, pageWidth, pageHeight, margin);
}
