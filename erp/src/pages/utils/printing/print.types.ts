export type PrintDocumentType = 'sales_order' | 'receipt' | 'danfe';

export interface PrintJobResult {
  success: boolean;
  status: 'fallback_browser' | 'error';
  message?: string;
}
