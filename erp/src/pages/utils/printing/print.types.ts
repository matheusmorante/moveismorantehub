import Order from "@/pages/types/order.type";

export type PrintDocumentType = 'sales_order' | 'receipt' | 'danfe' | 'test';

export interface PrintMargins {
    top: string;
    right: string;
    bottom: string;
    left: string;
}

export interface PrintPreset {
    printerName: string;
    paperSize: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    copies: number;
    scale: number;
    quality?: 'draft' | 'normal' | 'high';
    monochrome?: boolean;
    margins: PrintMargins;
}

export interface MachinePrintConfig {
    defaultPrinter: string;
    orderPrinter: string;
    receiptPrinter: string;
    danfePrinter: string;
    orderQuality?: 'draft' | 'normal' | 'high';
    receiptQuality?: 'draft' | 'normal' | 'high';
    danfeQuality?: 'draft' | 'normal' | 'high';
    orderScale?: number;
    receiptScale?: number;
    danfeScale?: number;
}

export interface PrinterDevice {
    name: string;
    isDefault: boolean;
    portName?: string;
}

export interface PrintJobPayload {
    printJobId: string;
    type: PrintDocumentType;
    html?: string;
    pdfBase64?: string;
    printerName?: string;
    options?: Partial<PrintPreset>;
}

export interface PrintAgentHealth {
    isOnline: boolean;
    version?: string;
    agent?: string;
    error?: string;
}

export interface PrintJobResult {
    success: boolean;
    status: 'sent_to_spooler' | 'fallback_browser' | 'already_processed' | 'error';
    printer?: string;
    message?: string;
}
