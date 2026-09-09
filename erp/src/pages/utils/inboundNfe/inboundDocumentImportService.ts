import { supabase, supabasePublicAnonKey, supabasePublicUrl } from '../supabaseConfig';
import { InboundInvoice, InboundInvoiceItem } from './inboundNfeTypes';

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const allowedMime = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export type InboundDocumentExtraction = { invoice: Record<string, any>; issuer: Record<string, any>; recipient: Record<string, any>; items: InboundInvoiceItem[]; warnings: string[]; confidence: Record<string, unknown> };
export type InboundDocumentAnalysis = { extraction: InboundDocumentExtraction; documentPath: string; documentMime: string };
export type InboundDocumentAnalysisStage = 'uploading' | 'preparing' | 'extracting' | 'validating' | 'finalizing';

export async function analyzeInboundInvoiceDocument(file: File, onStage?: (stage: InboundDocumentAnalysisStage) => void): Promise<InboundDocumentAnalysis> {
    if (!allowedMime.has(file.type) || file.size > MAX_FILE_SIZE) throw new Error('Envie um PDF, PNG ou JPG de até 12 MB.');
    onStage?.('uploading');
    // Em desenvolvimento a sessão persistida pode ter sido emitida antes de uma
    // troca de configuração do projeto. Renova e valida antes de enviar o arquivo.
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    const session = refreshed.session;
    if (refreshError || !session?.access_token) throw new Error('Sua sessão expirou. Entre novamente no ERP para analisar a NF.');
    const { error: userError } = await supabase.auth.getUser(session.access_token);
    if (userError) throw new Error('Sua sessão não é válida neste ambiente. Saia e entre novamente no ERP.');
    const body = new FormData();
    body.append('file', file, file.name);
    onStage?.('preparing');
    const functionUrl = `${supabasePublicUrl}/functions/v1/analyze-inbound-invoice`;
    const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: supabasePublicAnonKey,
        },
        // Não definir Content-Type: o navegador acrescenta o boundary correto
        // para que a Edge Function reconheça multipart/form-data.
        body,
    });
    const rawResponse = await response.text();
    const data = (() => { try { return rawResponse ? JSON.parse(rawResponse) : null; } catch { return null; } })();
    if (!response.ok || !data) {
        if (import.meta.env.DEV) console.error('[NF import] Edge Function response', { status: response.status, body: rawResponse.slice(0, 500) });
        throw new Error(data?.error || 'Não foi possível analisar o documento fiscal.');
    }
    if (data.error) throw new Error(data.error);
    return data as InboundDocumentAnalysis;
}

export function invoiceFromDocumentAnalysis(analysis: InboundDocumentAnalysis): InboundInvoice {
    const { invoice, issuer, recipient, items, warnings, confidence } = analysis.extraction;
    const subtotal = Number(invoice.totalProducts || 0);
    const freight = Number(invoice.freight || 0);
    return {
        id: `draft_${crypto.randomUUID()}`, nfeKey: String(invoice.accessKey || ''), nfeNumber: String(invoice.number || ''), series: String(invoice.series || ''),
        issuedAt: invoice.issuedAt || new Date().toISOString(), entryExitAt: invoice.entryExitAt || undefined, operationNature: invoice.operationNature || undefined, model: invoice.model || undefined, protocol: invoice.protocol || undefined, additionalInfo: invoice.additionalInfo || undefined,
        emitterCnpj: String(issuer.taxId || ''), emitterName: String(issuer.legalName || ''), emitterTradeName: issuer.tradeName || undefined, emitterIe: issuer.stateRegistration || undefined, emitterAddress: issuer.address || {},
        recipientCnpj: String(recipient?.taxId || ''), recipientName: String(recipient?.legalName || ''), totalProducts: subtotal, totalFreight: freight, totalIpi: Number(invoice.ipi || 0), totalDiscount: Number(invoice.discount || 0), totalInsurance: Number(invoice.insurance || 0), totalOtherExpenses: Number(invoice.otherExpenses || 0), totalIcms: Number(invoice.icms || 0), freightPercent: subtotal > 0 ? Number(((freight / subtotal) * 100).toFixed(4)) : 0,
        totalInvoice: Number(invoice.totalInvoice || 0), totalIcmsSt: Number(invoice.icmsSt || 0), ipiPercent: subtotal > 0 ? Number(((Number(invoice.ipi || 0) / subtotal) * 100).toFixed(4)) : 0, status: 'pending', itemsCount: items.length, items, originalDocumentPath: analysis.documentPath, originalDocumentMime: analysis.documentMime, extractionWarnings: warnings, extractionConfidence: confidence, extractionStatus: warnings.length ? 'review_required' : 'completed', processedAt: new Date().toISOString(), aiModel: 'gemini-2.5-flash', rawExtraction: { invoice, issuer, recipient, items, warnings, confidence }, createdAt: new Date().toISOString(),
    };
}
