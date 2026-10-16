import type { PdfRenderContext } from '../types';
import { MORANTE_LOGO_BASE64 } from '../../moranteLogoBase64';
import {
  WARRANTY_FOLIAGE_TOP_LEFT,
  WARRANTY_FOLIAGE_TOP_RIGHT,
  WARRANTY_FOLIAGE_BOTTOM_WAVE,
} from '../../warrantyFoliageBase64';
import { CAVEAT_BOLD_TTF_BASE64 } from '../../fonts/caveatFontBase64';
import { COLOR_NAVY, COLOR_GOLD, COLOR_MUTED, COLOR_BORDER } from '../pdfConstants';

/**
 * Registra a fonte caligráfica oficial (Caveat Bold) no documento jsPDF, se ainda não registrada.
 */
function ensureCursiveFontRegistered(doc: any): boolean {
  try {
    if (!doc.existsFileInVFS('Caveat-Bold.ttf')) {
      doc.addFileToVFS('Caveat-Bold.ttf', CAVEAT_BOLD_TTF_BASE64);
      doc.addFont('Caveat-Bold.ttf', 'Caveat', 'bold');
    }
    return true;
  } catch (err) {
    console.warn('Não foi possível registrar a fonte Caveat no PDF:', err);
    return false;
  }
}

/**
 * Renderiza a Página 1 (Capa Oficial do Termo de Garantia — Modelo 2).
 * Título em negrito e tamanho gigante (quase toda a largura da folha A4),
 * sem repetição do nome da loja (já presente na logo), com slogan na fonte caligráfica oficial,
 * folhagens nítidas e proporcionais nos cantos e rodapé em ondas orgânicas fiéis ao preview.
 */
export function renderPdfCoverPage(context: PdfRenderContext): void {
  const {
    doc,
    pageWidth,
    pageHeight,
    orderCode,
    purchaseDate,
    companyInfo,
    qrCodeDataUrl,
    formattedValidationCode,
  } = context;

  // Garante o registro da fonte cursiva oficial para o slogan
  const hasCursiveFont = ensureCursiveFontRegistered(doc);

  // 1. Folhagens decorativas botânicas nos cantos superiores (proporcionais e sem distorção)
  // Aspect ratio original do PNG: 780x840 -> largura 68mm, altura ~73.2mm
  const foliageW = 68;
  const foliageH = 73.2;
  try {
    doc.addImage(WARRANTY_FOLIAGE_TOP_LEFT, 'PNG', 0, 0, foliageW, foliageH);
    doc.addImage(WARRANTY_FOLIAGE_TOP_RIGHT, 'PNG', pageWidth - foliageW, 0, foliageW, foliageH);
  } catch (err) {
    console.warn('Falha ao inserir folhagens de canto no PDF:', err);
  }

  // 2. Logo Oficial Móveis Morante Centralizado em destaque (46x46mm)
  // Nota: o nome "Móveis Morante" já está inserido no emblema da logo oficial, não devendo ser repetido abaixo
  const coverLogoSize = 46;
  const coverLogoX = (pageWidth - coverLogoSize) / 2;
  const coverLogoY = 20;
  try {
    doc.addImage(MORANTE_LOGO_BASE64, 'PNG', coverLogoX, coverLogoY, coverLogoSize, coverLogoSize);
  } catch {
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.text('MÓVEIS MORANTE', pageWidth / 2, coverLogoY + 24, { align: 'center' });
  }

  // 3. Linha Superior do Título: — TERMO DE — (Negrito, imponente, com frisos dourados)
  let coverY = coverLogoY + coverLogoSize + 18; // ~84mm
  const titleCenterX = pageWidth / 2; // 105mm

  doc.setFont('times', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  const termoDeWidth = doc.getTextWidth('TERMO DE'); // ~68.5mm
  const halfTermoW = termoDeWidth / 2;

  // Frisos dourados laterais alinhados ao texto "TERMO DE"
  doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.setLineWidth(1.4);
  doc.line(titleCenterX - halfTermoW - 38, coverY - 2.8, titleCenterX - halfTermoW - 6, coverY - 2.8);
  doc.line(titleCenterX + halfTermoW + 6, coverY - 2.8, titleCenterX + halfTermoW + 38, coverY - 2.8);
  doc.text('TERMO DE', titleCenterX, coverY, { align: 'center' });

  // 4. Título Principal em Destaque Gigante: GARANTIA (Dobro do tamanho anterior, ocupando quase toda a largura)
  coverY += 28; // ~112mm
  doc.setFont('times', 'bold');
  doc.setFontSize(88); // O dobro do tamanho anterior (~48pt -> ~88pt)
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('GARANTIA', titleCenterX, coverY, { align: 'center' });

  // Barra de Destaque Amarelo Ouro Larga Centralizada
  coverY += 6; // ~118mm
  doc.setFillColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.roundedRect((pageWidth - 140) / 2, coverY, 140, 2.6, 1.3, 1.3, 'F');

  // 5. Slogan Oficial em Letra Cursiva / Caligráfica de Escrita à Mão (Caveat Bold)
  coverY += 22; // ~140mm
  if (hasCursiveFont) {
    doc.setFont('Caveat', 'bold');
    doc.setFontSize(34);
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(24);
  }
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('Mais que uma compra,', titleCenterX, coverY, { align: 'center' });

  coverY += 12; // ~152mm
  if (hasCursiveFont) {
    doc.setFont('Caveat', 'bold');
    doc.setFontSize(38);
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(26);
  }
  doc.setTextColor(180, 83, 9); // Âmbar Dourado #b45309 com alto contraste
  doc.text('uma parceria!', titleCenterX, coverY, { align: 'center' });

  // Friso ouro de respiro abaixo do slogan
  coverY += 6; // ~158mm
  doc.setFillColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.roundedRect((pageWidth - 40) / 2, coverY, 40, 1.2, 0.6, 0.6, 'F');

  // 6. Carimbo Oficial do Certificado Digital / Assinatura Digital ICP-Brasil (Ampliado)
  const stampW = 166;
  const stampH = 34;
  const stampX = (pageWidth - stampW) / 2;
  const stampY = 172;

  doc.setFillColor(252, 253, 255);
  doc.setDrawColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(stampX, stampY, stampW, stampH, 2.5, 2.5, 'FD');

  doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(stampX + 0.8, stampY + 0.8, stampW - 1.6, stampH - 1.6, 2.0, 2.0, 'D');

  // Cabeçalho do Carimbo com Selo de Segurança
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('DOCUMENTO ASSINADO DIGITALMENTE', stampX + 5, stampY + 5.5);

  doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.roundedRect(stampX + stampW - 32, stampY + 2.0, 28, 4.8, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.text('ICP-BRASIL / A1', stampX + stampW - 18, stampY + 5.4, { align: 'center' });

  doc.setDrawColor(220, 226, 235);
  doc.setLineWidth(0.2);
  doc.line(stampX + 2, stampY + 7.8, stampX + stampW - 2, stampY + 7.8);

  // Bloco QR Code (Ampliado e sempre nítido)
  const qrBoxX = stampX + 4.5;
  const qrBoxY = stampY + 9.5;
  const qrBoxSize = 18.0;
  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
    } catch {
      doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 1.5, 1.5, 'D');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
      doc.text('QR CODE', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize / 2 + 2, { align: 'center' });
    }
  } else {
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 1.5, 1.5, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text('QR CODE', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize / 2 + 2, { align: 'center' });
  }

  // Detalhes da Certificação Digital
  const textX = stampX + 26.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('MÓVEIS MORANTE COMÉRCIO DE MÓVEIS LTDA', textX, stampY + 12.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('CNPJ: 44.512.248/0001-07  •  Certificação: ICP-Brasil A1 • SHA-256', textX, stampY + 16.8);

  doc.text(
    `Data da Assinatura: ${purchaseDate} às 14:30 (Horário de Brasília)  •  Pedido #${orderCode}`,
    textX,
    stampY + 20.8
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text(`Cód. Autenticidade: ${formattedValidationCode}`, textX, stampY + 24.8);

  // Rodapé Jurídico do Carimbo
  doc.setDrawColor(220, 226, 235);
  doc.setLineWidth(0.15);
  doc.line(stampX + 2, stampY + 26.8, stampX + stampW - 2, stampY + 26.8);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(
    'Conforme Medida Provisória nº 2.200-2/2001 — Validade jurídica assegurada em todo o território nacional',
    stampX + 4.5,
    stampY + 30.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('VALIDADE EM TODO O BRASIL', stampX + stampW - 4.5, stampY + 30.5, { align: 'right' });

  // 7. Rodapé Curvado com Ondas Orgânicas Vetoriais Idênticas ao Preview (SVG)
  // Camada 1: Onda Ouro Superior (maior e mais alta)
  doc.setFillColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.moveTo(0, 255.0);
  doc.curveTo(38.5, 274.6, 84.0, 238.2, 133.0, 260.6);
  doc.curveTo(164.5, 274.6, 189.0, 260.6, 210.0, 246.6);
  doc.lineTo(210, pageHeight);
  doc.lineTo(0, pageHeight);
  doc.close();
  doc.fill();

  // Camada 2: Onda Azul Noturno Inferior (maior e mais alta)
  doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.moveTo(0, 262.0);
  doc.curveTo(42.0, 278.8, 85.75, 245.2, 134.75, 266.2);
  doc.curveTo(166.25, 278.8, 189.875, 266.2, 210.0, 253.6);
  doc.lineTo(210, pageHeight);
  doc.lineTo(0, pageHeight);
  doc.close();
  doc.fill();

  // 8. Folhagem botânica no canto inferior esquerdo sobreposta à onda (ancorada na base)
  // Proporção 1:1 ampliada proporcionalmente à onda
  const waveFoliageSize = 54;
  const waveFoliageY = pageHeight - waveFoliageSize; // 297 - 54 = 243mm
  try {
    doc.addImage(WARRANTY_FOLIAGE_BOTTOM_WAVE, 'PNG', 1.0, waveFoliageY, waveFoliageSize, waveFoliageSize);
  } catch (err) {
    console.warn('Falha ao inserir folhagem da onda no PDF:', err);
  }

  // 9. Conteúdo Institucional Centralizado sobre a Onda (com fontes ampliadas e destaque dourado)
  doc.setFillColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.roundedRect((pageWidth - 32) / 2, 274.5, 32, 1.4, 0.7, 0.7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.0);
  doc.text('MÓVEIS MORANTE COMÉRCIO DE MÓVEIS LTDA', pageWidth / 2, 282.0, { align: 'center' });

  doc.setTextColor(215, 225, 238);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `CNPJ: 44.512.248/0001-07  •  WhatsApp: ${companyInfo.phone}  •  Colombo - PR`,
    pageWidth / 2,
    288.5,
    { align: 'center' }
  );
}
