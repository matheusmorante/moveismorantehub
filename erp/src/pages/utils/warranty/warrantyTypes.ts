import type Order from '@/pages/types/order.type';

export type WarrantyDeliveryStatus = 'not_sent' | 'pending' | 'sent' | 'delivered' | 'failed';

export interface WarrantyTermRecord {
  id: string;
  order_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  document_version: number;
  file_name: string;
  file_path?: string | null;
  file_url?: string | null;
  file_hash_sha256: string;
  generated_at: string;
  sent_at?: string | null;
  send_recipient?: string | null;
  send_channel?: string | null;
  send_mode?: 'graph_api' | 'wame' | null;
  api_message_id?: string | null;
  api_response?: Record<string, unknown> | null;
  delivery_status: WarrantyDeliveryStatus;
  delivery_status_updated_at?: string | null;
  failure_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WarrantyCompanyInfo {
  name: string;
  cnpj: string;
  phone: string;
  telephoneCall?: string;
  address: string;
  contactEmail?: string;
  openingHours?: string;
}

export interface WarrantyPdfParams {
  order: Order;
  version?: number;
  companyInfo?: WarrantyCompanyInfo;
}

export interface GeneratedWarrantyPdf {
  pdfBytes: Uint8Array;
  pdfBlob: Blob;
  pdfUrl: string;
  sha256: string;
  fileName: string;
  version: number;
}

export interface WarrantyParagraph {
  subtitle?: string;
  text: string;
}

export interface WarrantyAlert {
  title: string;
  text: string;
}

export interface WarrantySection {
  number: string;
  title: string;
  text?: string;
  alert?: WarrantyAlert;
  paragraphs?: WarrantyParagraph[];
}

export interface WarrantyCoverBadge {
  id: string;
  titleLine1: string;
  titleLine2: string;
  iconType: 'couch' | 'shield' | 'headset' | 'lock';
}
