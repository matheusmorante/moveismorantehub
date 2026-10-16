import { jsPDF } from 'jspdf';
import { formatOrderCode } from '../orderCode';
import { formatDate } from '../formatters';
import type { GeneratedWarrantyPdf, WarrantyPdfParams } from './warrantyTypes';
import { DEFAULT_WARRANTY_COMPANY_INFO } from './warrantyLegalContent';
import { calculateSha256 } from './cryptoUtils';
import {
  PDF_PAGE_WIDTH,
  PDF_PAGE_HEIGHT,
  PDF_MARGIN,
  PDF_CONTENT_WIDTH,
  generateQrCodeDataUrl,
  renderPdfCoverPage,
  renderPdfClausesPage1,
  renderPdfClausesPage2,
  type PdfRenderContext,
} from './pdf';

// Re-exporta para manter compatibilidade retroativa total
export { calculateSha256 };

/**
 * Orquestrador da geração do Termo de Garantia em PDF oficial da Móveis Morante.
 * Aplica princípios SOLID, modularidade e separação de responsabilidades por página.
 */
export async function generateWarrantyPdf({
  order,
  version = 1,
  companyInfo = DEFAULT_WARRANTY_COMPANY_INFO,
}: WarrantyPdfParams): Promise<GeneratedWarrantyPdf> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const orderCode = formatOrderCode(order);
  const purchaseDate = order.date ? formatDate(order.date) : 'Data da compra';
  const customerName = order.customerData?.fullName || 'Cliente Móveis Morante';
  const customerDoc = order.customerData?.cpfCnpj || 'Não informado';
  const customerPhone = order.customerData?.phone || 'Não informado';
  const items = order.items && order.items.length > 0 ? order.items : [];

  const verificationUrl = `https://morante.com.br/validar/${orderCode}`;
  const qrCodeDataUrl = await generateQrCodeDataUrl(verificationUrl);
  const rawHash = (orderCode + (order.id || '44512248000107')).replace(/[^a-zA-Z0-9]/g, '');
  const validationCode = (
    rawHash.length >= 16 ? rawHash.slice(0, 16) : rawHash.padEnd(16, '0')
  ).toUpperCase();
  const formattedValidationCode = validationCode.match(/.{1,4}/g)?.join('-') || validationCode;

  const renderContext: PdfRenderContext = {
    doc,
    pageWidth: PDF_PAGE_WIDTH,
    pageHeight: PDF_PAGE_HEIGHT,
    margin: PDF_MARGIN,
    contentWidth: PDF_CONTENT_WIDTH,
    orderCode,
    purchaseDate,
    customerName,
    customerDoc,
    customerPhone,
    items,
    companyInfo,
    version,
    qrCodeDataUrl,
    formattedValidationCode,
  };

  // Renderização modularizada por página
  // Página 1: Capa Oficial Modelo 2 com Carimbo Digital e Ondas Orgânicas
  renderPdfCoverPage(renderContext);

  // Página 2: Identificação da Compra, Itens Adquiridos e Tópicos 1 a 4
  renderPdfClausesPage1(renderContext);

  // Página 3: Tópicos 5 a 9, Card de Contato CDC e Assinatura Visual
  renderPdfClausesPage2(renderContext);

  // Geração de artefatos de saída e cálculo do hash criptográfico SHA-256
  const arrayBuffer = doc.output('arraybuffer');
  const pdfBytes = new Uint8Array(arrayBuffer);
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const sha256 = await calculateSha256(pdfBytes);
  const fileName = `termo_garantia_pedido_${orderCode}_v${version}.pdf`;

  return {
    pdfBytes,
    pdfBlob,
    pdfUrl,
    sha256,
    fileName,
    version,
  };
}
