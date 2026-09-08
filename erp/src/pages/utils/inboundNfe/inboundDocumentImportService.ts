import { supabase } from '../supabaseConfig';
import { InboundInvoice, InboundInvoiceItem } from './inboundNfeTypes';

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const allowedMime = new Set(['application/pdf', 'image/png', 'image/jpeg']);

const readAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o documento.'));
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(file);
});

export type InboundDocumentExtraction = { invoice: Record<string, any>; issuer: Record<string, any>; items: InboundInvoiceItem[]; warnings: string[]; confidence: Record<string, unknown> };
export type InboundDocumentAnalysis = { extraction: InboundDocumentExtraction; documentPath: string; documentMime: string };

export async function analyzeInboundInvoiceDocument(file: File): Promise<InboundDocumentAnalysis> {
    if (!allowedMime.has(file.type) || file.size > MAX_FILE_SIZE) throw new Error('Envie um PDF, PNG ou JPG de até 12 MB.');
    const base64 = await readAsBase64(file);
    // Em desenvolvimento a sessão persistida pode ter sido emitida antes de uma
    // troca de configuração do projeto. Renova e valida antes de enviar o arquivo.
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    const session = refreshed.session;
    if (refreshError || !session?.access_token) throw new Error('Sua sessão expirou. Entre novamente no ERP para analisar a NF.');
    const { error: userError } = await supabase.auth.getUser(session.access_token);
    if (userError) throw new Error('Sua sessão não é válida neste ambiente. Saia e entre novamente no ERP.');
    const { data, error } = await supabase.functions.invoke('analyze-inbound-invoice', {
        body: { fileName: file.name, mimeType: file.type, base64 },
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error || !data) {
        const responseError = await (error as any)?.context?.json?.().catch(() => null);
        throw new Error(responseError?.error || data?.error || error?.message || 'Não foi possível analisar o documento.');
    }
    if (data.error) throw new Error(data.error);
    return data as InboundDocumentAnalysis;
}

export function invoiceFromDocumentAnalysis(analysis: InboundDocumentAnalysis): InboundInvoice {
    const { invoice, issuer, items, warnings, confidence } = analysis.extraction;
    const subtotal = Number(invoice.totalProducts || 0);
    const freight = Number(invoice.freight || 0);
    return {
        id: `draft_${crypto.randomUUID()}`, nfeKey: String(invoice.accessKey || ''), nfeNumber: String(invoice.number || ''), series: String(invoice.series || ''),
        issuedAt: invoice.issuedAt || new Date().toISOString(), entryExitAt: invoice.entryExitAt || undefined, operationNature: invoice.operationNature || undefined, model: invoice.model || undefined, protocol: invoice.protocol || undefined,
        emitterCnpj: String(issuer.taxId || ''), emitterName: String(issuer.legalName || ''), emitterTradeName: issuer.tradeName || undefined, emitterIe: issuer.stateRegistration || undefined, emitterAddress: issuer.address || {},
        recipientCnpj: '', recipientName: '', totalProducts: subtotal, totalFreight: freight, totalIpi: Number(invoice.ipi || 0), totalDiscount: Number(invoice.discount || 0), totalInsurance: Number(invoice.insurance || 0), totalOtherExpenses: Number(invoice.otherExpenses || 0), totalIcms: Number(invoice.icms || 0), freightPercent: subtotal > 0 ? Number(((freight / subtotal) * 100).toFixed(4)) : 0,
        totalInvoice: Number(invoice.totalInvoice || 0), status: 'pending', itemsCount: items.length, items, originalDocumentPath: analysis.documentPath, originalDocumentMime: analysis.documentMime, extractionWarnings: warnings, extractionConfidence: confidence, createdAt: new Date().toISOString(),
    };
}
