import type { jsPDF } from 'jspdf';
import type Order from '@/pages/types/order.type';
import type { WarrantyCompanyInfo } from '../warrantyTypes';

export interface SectionParagraph {
  subtitle?: string;
  text: string;
  isAlert?: boolean;
}

export interface PdfRenderContext {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  orderCode: string;
  purchaseDate: string;
  customerName: string;
  customerDoc: string;
  customerPhone: string;
  items: NonNullable<Order['items']>;
  companyInfo: WarrantyCompanyInfo;
  version: number;
  qrCodeDataUrl: string;
  formattedValidationCode: string;
}
