import { supabase } from '../../supabaseConfig';
import { InboundInvoice, InboundInvoiceItem } from '../types/inboundNfeTypes';
import { parseInboundNfeXml } from '../utils/inboundXmlParser';
import { DateFilterConfig } from '../../../App/Stock/InboundInvoices/InboundInvoicesHeader';
import { isValidUuid } from '../../uuidUtils';
import { getMonthDateBounds, getCurrentYearMonthStr, getPreviousYearMonthStr, getYearDateBounds, getCurrentYearStr, getPreviousYearStr } from './inboundInvoicesFilters';
import { getLocalInvoices, isSampleInvoice } from './inboundInvoicesCache';
import { normalizeInvoiceItem, normalizeAdditionalCost, normalizeAdditionalCosts, toInboundInvoiceStatus } from './inboundInvoicesMapper';

export interface FetchInboundInvoicesOptions {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    dateFilter?: DateFilterConfig;
}

export interface FetchInboundInvoicesResult {
    invoices: InboundInvoice[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const fetchInboundInvoicesPage = async (options?: FetchInboundInvoicesOptions): Promise<FetchInboundInvoicesResult> => {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 15;
    const searchTerm = (options?.searchTerm || '').trim();
    const dateFilter = options?.dateFilter;

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (dateFilter) {
        if (dateFilter.mode === 'current_month') {
            const bounds = getMonthDateBounds(getCurrentYearMonthStr());
            if (bounds) { startDate = bounds.start; endDate = bounds.end; }
        } else if (dateFilter.mode === 'previous_month') {
            const bounds = getMonthDateBounds(getPreviousYearMonthStr());
            if (bounds) { startDate = bounds.start; endDate = bounds.end; }
        } else if (dateFilter.mode === 'current_year') {
            const bounds = getYearDateBounds(getCurrentYearStr());
            if (bounds) { startDate = bounds.start; endDate = bounds.end; }
        } else if (dateFilter.mode === 'previous_year') {
            const bounds = getYearDateBounds(getPreviousYearStr());
            if (bounds) { startDate = bounds.start; endDate = bounds.end; }
        } else if (dateFilter.mode === 'custom_month') {
            const bounds = getMonthDateBounds(dateFilter.customMonth || getCurrentYearMonthStr());
            if (bounds) { startDate = bounds.start; endDate = bounds.end; }
        } else if (dateFilter.mode === 'custom_range') {
            const startBounds = getMonthDateBounds(dateFilter.startMonth || getPreviousYearMonthStr());
            const endBounds = getMonthDateBounds(dateFilter.endMonth || getCurrentYearMonthStr());
            if (startBounds) startDate = startBounds.start;
            if (endBounds) endDate = endBounds.end;
        }
    }

    const local = getLocalInvoices().filter((inv) => !isSampleInvoice(inv));

    try {
        const cleanNum = searchTerm.replace(/\D/g, '');
        // Chave de acesso NF-e tem exatamente 44 dígitos.
        // Quando detectada, ignora filtro de data — a chave é identificador único global.
        const isAccessKeySearch = cleanNum.length === 44;

        let query = supabase
            .from('inbound_invoices')
            .select('*, inbound_invoice_items(*)', { count: 'exact' });

        if (!isAccessKeySearch) {
            if (startDate) {
                query = query.gte('data_emissao', startDate);
            }
            if (endDate) {
                query = query.lte('data_emissao', endDate);
            }
        }

        if (searchTerm) {
            if (isAccessKeySearch) {
                // Busca exata pela chave (sem wildcards laterais desnecessários, mas mantém ilike para compatibilidade)
                query = query.or(`chave_acesso.ilike.%${cleanNum}%,chave_acesso.eq.${cleanNum}`);
            } else if (cleanNum.length > 0) {
                query = query.or(`emitente_nome.ilike.%${searchTerm}%,chave_acesso.ilike.%${cleanNum}%,numero_nfe.ilike.%${searchTerm}%,emitente_cnpj.ilike.%${searchTerm}%`);
            } else {
                query = query.ilike('emitente_nome', `%${searchTerm}%`);
            }
        }

        query = query.order('data_emissao', { ascending: false });

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (!error && data) {
            const mapped: InboundInvoice[] = data
                .filter((row: any) => !isSampleInvoice({ id: row.id, nfeKey: row.chave_acesso, nfeNumber: String(row.numero_nfe || ''), emitterCnpj: row.emitente_cnpj }))
                .map((row: any) => {
                    const sources: any[][] = [];
                    if (Array.isArray(row.inbound_invoice_items) && row.inbound_invoice_items.length > 0) sources.push(row.inbound_invoice_items);
                    if (Array.isArray(row.itens) && row.itens.length > 0) sources.push(row.itens);
                    if (row.raw_extraction?.items && Array.isArray(row.raw_extraction.items)) sources.push(row.raw_extraction.items);
                    if (row.raw_extraction?.itens && Array.isArray(row.raw_extraction.itens)) sources.push(row.raw_extraction.itens);
                    if (row.xml_conteudo) {
                        try {
                            const parsedFromXml = parseInboundNfeXml(row.xml_conteudo);
                            if (parsedFromXml.items && parsedFromXml.items.length > 0) sources.push(parsedFromXml.items);
                        } catch {}
                    }

                    const maxLen = Math.max(0, ...sources.map(s => s.length));
                    let childItems: InboundInvoiceItem[] = [];

                    for (let idx = 0; idx < maxLen; idx++) {
                        const candidates = sources.map(s => s[idx]).filter(Boolean);
                        const normalized = candidates.map(c => normalizeInvoiceItem(c, idx));

                        const desc = normalized.map(c => c.productDescription).find(d => d && d !== 'Item sem descrição') || normalized[0]?.productDescription || 'Item sem descrição';
                        const code = normalized.map(c => c.productCode).find(c => c && c.trim() !== '') || normalized[0]?.productCode || '';
                        const qty = normalized.map(c => c.quantity).find(q => q > 0) || normalized[0]?.quantity || 0;
                        const uCost = normalized.map(c => c.unitCost).find(u => u > 0) || normalized[0]?.unitCost || 0;
                        const tCost = normalized.map(c => c.totalCost).find(t => t > 0) || normalized[0]?.totalCost || (qty * uCost);
                        const ncm = normalized.map(c => c.ncm).find(n => n && n.trim() !== '') || normalized[0]?.ncm || '';
                        const cfop = normalized.map(c => c.cfop).find(c => c && c.trim() !== '') || normalized[0]?.cfop || '';
                        const unit = normalized.map(c => c.unit).find(u => u && u.trim() !== '') || normalized[0]?.unit || 'UN';

                        const matchedProductId = normalized.map(c => c.matchedProductId).find(Boolean);
                        const matchedVariationId = normalized.map(c => c.matchedVariationId).find(Boolean);
                        const productErpName = normalized.map(c => c.productErpName).find(Boolean);
                        const linkedProductCode = normalized.map(c => c.linkedProductCode).find(Boolean);

                        childItems.push({
                            ...normalized[0],
                            itemNumber: idx + 1,
                            productDescription: desc,
                            productCode: code,
                            quantity: qty,
                            unitCost: uCost,
                            totalCost: tCost,
                            ncm,
                            cfop,
                            unit,
                            matchedProductId,
                            matchedVariationId,
                            productErpName,
                            linkedProductCode,
                        });
                    }

                    return {
                        id: row.id,
                        nfeKey: row.chave_acesso || '',
                        nfeNumber: String(row.numero_nfe || ''),
                        series: row.series || row.serie || '1',
                        issuedAt: row.data_emissao,
                        emitterCnpj: row.emitente_cnpj || '',
                        emitterName: row.emitente_nome || '',
                        emitterTradeName: row.emitente_fantasia,
                        emitterIe: row.emitente_ie || undefined,
                        emitterAddress: row.emitente_endereco || {},
                        supplierId: row.supplier_id || undefined,
                        recipientCnpj: row.destinatario_cnpj || '',
                        recipientName: row.destinatario_nome || '',
                        totalProducts: Number(row.valor_produtos || 0),
                        totalFreight: Number(row.valor_frete || 0),
                        totalIpi: Number(row.valor_ipi || 0),
                        totalDiscount: Number(row.valor_desconto || 0),
                        totalInsurance: Number(row.valor_seguro || 0),
                        totalOtherExpenses: Number(row.outras_despesas || 0),
                        additionalFreight: row.additional_freight ? normalizeAdditionalCost(row.additional_freight) : undefined,
                        additionalCosts: normalizeAdditionalCosts(row.additional_costs),
                        additionalCostsTotal: Number(row.additional_costs_total || 0),
                        additionalCostAllocations: Array.isArray(row.additional_cost_allocations) ? row.additional_cost_allocations : [],
                        totalIcms: Number(row.valor_icms || 0),
                        totalIcmsSt: Number(row.valor_icms_st || 0),
                        freightPercent: Number(row.valor_produtos || 0) > 0 ? Number((Number(row.valor_frete || 0) / Number(row.valor_produtos || 0) * 100).toFixed(4)) : 0,
                        entryExitAt: row.data_saida_entrada || undefined,
                        operationNature: row.natureza_operacao || undefined,
                        model: row.modelo || undefined,
                        protocol: row.protocolo || undefined,
                        additionalInfo: row.informacoes_adicionais || undefined,
                        originalDocumentPath: row.documento_original_path || undefined,
                        originalDocumentMime: row.documento_original_mime || undefined,
                        extractionWarnings: Array.isArray(row.extraction_warnings) ? row.extraction_warnings : [],
                        extractionConfidence: row.extraction_confidence || {},
                        extractionStatus: row.extraction_status || 'completed',
                        processedAt: row.extraction_processed_at || undefined,
                        aiModel: row.extraction_ai_model || undefined,
                        rawExtraction: row.raw_extraction || undefined,
                        totalInvoice: Number(row.valor_total || 0),
                        status: toInboundInvoiceStatus(row.status_recebimento),
                        itemsCount: childItems.length,
                        receiptId: row.receipt_id,
                        receivedAt: row.updated_at,
                        rawXml: row.xml_conteudo,
                        items: childItems,
                        createdAt: row.created_at
                    };
                });

            const remoteKeysAndIds = new Set(mapped.flatMap((inv) => [inv.nfeKey, inv.id].filter(Boolean)));
            let localOnly = local.filter((inv) => (inv.nfeKey ? !remoteKeysAndIds.has(inv.nfeKey) : !remoteKeysAndIds.has(inv.id)));

            if (!isAccessKeySearch) {
                if (startDate) {
                    localOnly = localOnly.filter((inv) => !inv.issuedAt || inv.issuedAt >= startDate!);
                }
                if (endDate) {
                    localOnly = localOnly.filter((inv) => !inv.issuedAt || inv.issuedAt <= endDate!);
                }
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const cleanNumLocal = searchTerm.replace(/\D/g, '');
                localOnly = localOnly.filter((inv) =>
                    (inv.emitterName || '').toLowerCase().includes(term) ||
                    (inv.nfeKey || '').includes(cleanNumLocal) ||
                    (inv.nfeNumber || '').includes(term)
                );
            }

            const combined = [...mapped, ...localOnly];
            const totalItemsCount = (count ?? mapped.length) + localOnly.length;
            const calculatedTotalPages = Math.ceil(totalItemsCount / pageSize) || 1;

            return {
                invoices: combined,
                totalCount: totalItemsCount,
                page,
                pageSize,
                totalPages: calculatedTotalPages,
            };
        }
    } catch (err) {
        console.warn('Fallback para cache local de notas fiscais de entrada:', err);
    }

    // Fallback Local Cache
    let filteredLocal = local;
    if (startDate) {
        filteredLocal = filteredLocal.filter((inv) => !inv.issuedAt || inv.issuedAt >= startDate!);
    }
    if (endDate) {
        filteredLocal = filteredLocal.filter((inv) => !inv.issuedAt || inv.issuedAt <= endDate!);
    }
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredLocal = filteredLocal.filter((inv) =>
            (inv.emitterName || '').toLowerCase().includes(term) ||
            (inv.nfeKey || '').includes(term) ||
            (inv.nfeNumber || '').includes(term)
        );
    }

    const totalCount = filteredLocal.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedInvoices = filteredLocal.slice(startIndex, startIndex + pageSize);

    return {
        invoices: paginatedInvoices,
        totalCount,
        page,
        pageSize,
        totalPages,
    };
};

export const fetchInboundInvoices = async (): Promise<InboundInvoice[]> => {
    const res = await fetchInboundInvoicesPage({ page: 1, pageSize: 1000 });
    return res.invoices;
};

export const checkInboundInvoiceKeyExists = async (
    nfeKey: string,
    currentInvoiceId?: string
): Promise<InboundInvoice | null> => {
    const cleanKey = (nfeKey || '').replace(/\D/g, '');
    if (cleanKey.length !== 44) return null;

    const local = getLocalInvoices().filter((inv) => !isSampleInvoice(inv));
    const localMatch = local.find(
        (inv) => inv.nfeKey === cleanKey && (!currentInvoiceId || inv.id !== currentInvoiceId)
    );
    if (localMatch) return localMatch;

    try {
        let query = supabase
            .from('inbound_invoices')
            .select('*')
            .eq('chave_acesso', cleanKey);

        if (currentInvoiceId && isValidUuid(currentInvoiceId)) {
            query = query.neq('id', currentInvoiceId);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
            const result: InboundInvoice = {
                id: data.id,
                nfeKey: data.chave_acesso || '',
                nfeNumber: String(data.numero_nfe || ''),
                series: data.series || data.serie || '1',
                issuedAt: data.data_emissao,
                emitterCnpj: data.emitente_cnpj || '',
                emitterName: data.emitente_nome || '',
                emitterTradeName: data.emitente_fantasia,
                emitterIe: data.emitente_ie || undefined,
                emitterAddress: data.emitente_endereco || {},
                supplierId: data.supplier_id || undefined,
                recipientCnpj: data.destinatario_cnpj || '',
                recipientName: data.destinatario_nome || '',
                totalProducts: Number(data.valor_produtos || 0),
                totalFreight: Number(data.valor_frete || 0),
                totalIpi: Number(data.valor_ipi || 0),
                totalDiscount: Number(data.valor_desconto || 0),
                totalInsurance: Number(data.valor_seguro || 0),
                totalOtherExpenses: Number(data.outras_despesas || 0),
                totalIcms: Number(data.valor_icms || 0),
                totalIcmsSt: Number(data.valor_icms_st || 0),
                freightPercent: Number(data.valor_produtos || 0) > 0 ? Number((Number(data.valor_frete || 0) / Number(data.valor_produtos || 0) * 100).toFixed(4)) : 0,
                entryExitAt: data.data_saida_entrada || undefined,
                operationNature: data.natureza_operacao || undefined,
                model: data.modelo || undefined,
                protocol: data.protocolo || undefined,
                additionalInfo: data.informacoes_adicionais || undefined,
                totalInvoice: Number(data.valor_total || 0),
                status: toInboundInvoiceStatus(data.status_recebimento),
                itemsCount: Array.isArray(data.itens) ? data.itens.length : 0,
                receiptId: data.receipt_id,
                receivedAt: data.updated_at,
                rawXml: data.xml_conteudo,
                items: Array.isArray(data.itens) ? data.itens : [],
                createdAt: data.created_at,
            };

            // Leitura de itens estruturados de inbound_invoice_items com fallback no JSONB legado
            try {
                const { data: itemRows, error: itemError } = await supabase
                    .from('inbound_invoice_items')
                    .select('*')
                    .eq('inbound_invoice_id', data.id)
                    .order('item_index', { ascending: true });

                if (!itemError && itemRows && itemRows.length > 0) {
                    result.items = itemRows.map((r, idx) => normalizeInvoiceItem(r, idx));
                    result.itemsCount = itemRows.length;
                } else if (Array.isArray(result.items)) {
                    result.items = result.items.map((r, idx) => normalizeInvoiceItem(r, idx));
                }
            } catch (err) {
                console.warn('Fallback ativado para itens de inbound_invoice:', err);
            }

            return result;
        }
    } catch (err) {
        console.warn('Erro ao consultar duplicidade de chave de acesso:', err);
    }

    return null;
};
