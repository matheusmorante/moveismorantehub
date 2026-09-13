import { supabase } from '../supabaseConfig';
import { InboundInvoice } from './inboundNfeTypes';
import { parseInboundNfeXml } from './inboundXmlParser';
import { DateFilterConfig } from '../../App/Stock/InboundInvoices/InboundInvoicesHeader';

const STORAGE_KEY = 'morante_inbound_invoices_cache';
const LAST_SYNC_KEY = 'morante_inbound_invoices_last_sync_at';

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

const getCurrentYearStr = (): string => {
    return String(new Date().getFullYear());
};

const getPreviousYearStr = (): string => {
    return String(new Date().getFullYear() - 1);
};

const getYearDateBounds = (yearStr: string) => {
    const y = parseInt(yearStr, 10);
    if (isNaN(y)) return null;
    const start = `${yearStr}-01-01T00:00:00.000Z`;
    const end = `${yearStr}-12-31T23:59:59.999Z`;
    return { start, end };
};

const getCurrentYearMonthStr = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const getPreviousYearMonthStr = (): string => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const getMonthDateBounds = (yearMonth: string) => {
    if (!yearMonth || !yearMonth.includes('-')) return null;
    const [yStr, mStr] = yearMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(y) || isNaN(m)) return null;
    const paddedM = String(m).padStart(2, '0');
    const start = `${yStr}-${paddedM}-01T00:00:00.000Z`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = `${yStr}-${paddedM}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;
    return { start, end };
};

const toInboundInvoiceStatus = (value: string | null | undefined): InboundInvoice['status'] => {
    if (value === 'recebida' || value === 'received') return 'received';
    if (value === 'manifestada' || value === 'manifested') return 'manifested';
    return 'pending';
};

const normalizeAdditionalCost = (value: any) => {
    const calculationType = value?.calculationType === 'fixed' ? 'fixed' : 'percentage';
    const inputValue = value?.inputValue ?? (calculationType === 'percentage' ? value?.percentage : value?.fixedAmount);
    return {
        id: String(value?.id || `additional-cost-${Math.random().toString(36).slice(2)}`),
        description: String(value?.description || ''),
        calculationType,
        inputValue: inputValue === null || inputValue === undefined ? null : Number(inputValue),
        calculationBase: 'products_base_value' as const,
        calculatedAmount: Number(value?.calculatedAmount || 0),
        calculatedRate: Number(value?.calculatedRate ?? (value?.calculatedAmount && Number(value?.calculatedAmount) > 0 ? 0 : 0)),
    };
};

const normalizeAdditionalCosts = (value: unknown) => Array.isArray(value) ? value.map(normalizeAdditionalCost) : [];

export const getLastInboundInvoiceSyncAt = (): string | null => {
    try {
        return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
        return null;
    }
};

const saveLastInboundInvoiceSyncAt = (value: string) => {
    try {
        localStorage.setItem(LAST_SYNC_KEY, value);
    } catch (error) {
        console.warn('Não foi possível registrar a última atualização das NF-e.', error);
    }
};

const getLocalInvoices = (): InboundInvoice[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveLocalInvoices = (invoices: InboundInvoice[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch (e) {
        console.warn('Erro ao salvar notas de entrada no cache local', e);
    }
};

const isValidUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

const isSampleInvoice = (inv: { id?: string; nfeKey?: string; nfeNumber?: string; emitterCnpj?: string }) => {
    return inv.id === 'inbound_41260944512248000107550010000012341000012345' ||
        inv.nfeKey === '41260944512248000107550010000012341000012345' ||
        (inv.nfeNumber === '1234' && inv.emitterCnpj === '12.345.678/0001-90');
};

export const deleteInboundInvoice = async (invoiceIdOrKey: string): Promise<void> => {
    const local = getLocalInvoices().filter((inv) => inv.id !== invoiceIdOrKey && inv.nfeKey !== invoiceIdOrKey && !isSampleInvoice(inv));
    saveLocalInvoices(local);
    try {
        await supabase.from('inbound_invoices').delete().or(`id.eq.${invoiceIdOrKey},chave_acesso.eq.${invoiceIdOrKey}`);
    } catch (err) {
        console.warn('Erro ao deletar NF no Supabase:', err);
    }
};

export const normalizeInvoiceItem = (r: any, idx: number): InboundInvoiceItem => {
    const snap = (r && typeof r === 'object' && r.item_snapshot && typeof r.item_snapshot === 'object') ? r.item_snapshot : {};

    const descFromSnap = snap.productDescription || snap.descricao || snap.descricao_produto || snap.xProd || snap.xprod || '';
    const descFromR = r.productDescription || r.descricao || r.descricao_produto || r.xProd || r.xprod || r.codigo_produto_descricao || '';
    let desc = descFromSnap && descFromSnap !== 'Item sem descrição' ? descFromSnap : descFromR;
    if (!desc || desc === 'Item sem descrição') desc = descFromSnap || descFromR || 'Item sem descrição';

    const code = snap.productCode || snap.codigo || snap.cProd || snap.codigo_produto || r.productCode || r.codigo_produto || r.codigo || r.cProd || '';
    const num = snap.itemNumber ?? snap.numeroItem ?? r.itemNumber ?? r.item_index ?? r.numeroItem ?? idx + 1;
    const unit = snap.unit || snap.unidade || r.unit || r.unidade || 'UN';

    const qtySnap = snap.quantity ?? snap.quantidade;
    const qtyR = r.quantity ?? r.quantidade;
    const qty = Number(qtySnap !== undefined && qtySnap !== null && Number(qtySnap) > 0 ? qtySnap : (qtyR ?? 0));

    const uCostSnap = snap.unitCost ?? snap.valorUnitario ?? snap.valor_unitario;
    const uCostR = r.unitCost ?? r.valor_unitario ?? r.valorUnitario;
    const uCost = Number(uCostSnap !== undefined && uCostSnap !== null && Number(uCostSnap) > 0 ? uCostSnap : (uCostR ?? 0));

    const tCostSnap = snap.totalCost ?? snap.valorTotal ?? snap.valor_total;
    const tCostR = r.totalCost ?? r.valor_total ?? r.valorTotal;
    const calcTotal = qty * uCost;
    const tCost = Number(tCostSnap !== undefined && tCostSnap !== null && Number(tCostSnap) > 0 ? tCostSnap : (tCostR ?? calcTotal));

    const ncm = snap.ncm || r.ncm || '';
    const cfop = snap.cfop || r.cfop || '';

    return {
        ...r,
        ...snap,
        itemNumber: num,
        productCode: code,
        productDescription: desc,
        unit,
        quantity: qty,
        unitCost: uCost,
        totalCost: tCost,
        ncm,
        cfop,
        discountValue: Number(snap.discountValue ?? snap.valorDesconto ?? r.valor_desconto ?? r.discountValue ?? 0),
        freightValue: Number(snap.freightValue ?? snap.valorFrete ?? r.valor_frete ?? r.freightValue ?? 0),
        insuranceValue: Number(snap.insuranceValue ?? snap.valorSeguro ?? r.valor_seguro ?? r.insuranceValue ?? 0),
        otherExpensesValue: Number(snap.otherExpensesValue ?? snap.outrasDespesas ?? r.outras_despesas ?? r.otherExpensesValue ?? 0),
        matchedProductId: snap.matchedProductId || snap.matched_product_id || r.matched_product_id || r.matchedProductId || undefined,
        matchedVariationId: snap.matchedVariationId || snap.matched_variation_id || r.matched_variation_id || r.matchedVariationId || undefined,
        productErpName: snap.productErpName || snap.product_erp_name || r.product_erp_name || r.productErpName || undefined,
        linkedProductCode: snap.linkedProductCode || snap.linked_product_code || r.linked_product_code || r.linkedProductCode || undefined,
        normalizedParentName: snap.normalizedParentName || r.normalizedParentName || undefined,
        extractedAttributes: snap.extractedAttributes || r.extractedAttributes || undefined,
        detectedSupplierCodeFamily: snap.detectedSupplierCodeFamily || r.detectedSupplierCodeFamily || undefined,
    };
};

export const fetchInboundInvoicesPage = async (options?: FetchInboundInvoicesOptions): Promise<FetchInboundInvoicesResult> => {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 30;
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
        let query = supabase
            .from('inbound_invoices')
            .select('*, inbound_invoice_items(*)', { count: 'exact' });

        if (startDate) {
            query = query.gte('data_emissao', startDate);
        }
        if (endDate) {
            query = query.lte('data_emissao', endDate);
        }

        if (searchTerm) {
            const cleanNum = searchTerm.replace(/\D/g, '');
            if (cleanNum.length > 0) {
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

            if (startDate) {
                localOnly = localOnly.filter((inv) => !inv.issuedAt || inv.issuedAt >= startDate!);
            }
            if (endDate) {
                localOnly = localOnly.filter((inv) => !inv.issuedAt || inv.issuedAt <= endDate!);
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                localOnly = localOnly.filter((inv) =>
                    (inv.emitterName || '').toLowerCase().includes(term) ||
                    (inv.nfeKey || '').includes(term) ||
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

        if (currentInvoiceId) {
            query = query.neq('id', currentInvoiceId);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
            return {
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

export const saveInboundInvoice = async (invoice: InboundInvoice): Promise<InboundInvoice> => {
    if (isSampleInvoice(invoice)) return invoice;
    const accessKey = (invoice.nfeKey || '').replace(/\D/g, '');
    const validId = isValidUuid(invoice.id) ? invoice.id : crypto.randomUUID();
    const invoiceToSave: InboundInvoice = { ...invoice, id: validId, nfeKey: accessKey };
    const local = getLocalInvoices().filter((inv) => !isSampleInvoice(inv));
    const existingIndex = accessKey
        ? local.findIndex((inv) => inv.nfeKey === accessKey)
        : local.findIndex((inv) => inv.id === validId);
    if (existingIndex >= 0) {
        local[existingIndex] = invoiceToSave;
    } else {
        local.unshift(invoiceToSave);
    }
    saveLocalInvoices(local);

    try {
        const payload: Record<string, any> = {
            id: validId,
            chave_acesso: accessKey || null,
            numero_nfe: Number((invoice.nfeNumber || '').replace(/\D/g, '')) || 0,
            serie: invoice.series || '1',
            data_emissao: invoice.issuedAt || new Date().toISOString(),
            emitente_cnpj: invoice.emitterCnpj || '',
            emitente_nome: invoice.emitterName || '',
            emitente_fantasia: invoice.emitterTradeName || null,
            emitente_ie: invoice.emitterIe || null,
            emitente_endereco: invoice.emitterAddress || {},
            supplier_id: invoice.supplierId || null,
            destinatario_cnpj: invoice.recipientCnpj || '',
            destinatario_nome: invoice.recipientName || '',
            valor_produtos: invoice.totalProducts || 0,
            valor_frete: invoice.totalFreight || 0,
            valor_ipi: invoice.totalIpi || 0,
            valor_desconto: invoice.totalDiscount || 0,
            valor_seguro: invoice.totalInsurance || 0,
            outras_despesas: invoice.totalOtherExpenses || 0,
            valor_icms: invoice.totalIcms || 0,
            valor_icms_st: invoice.totalIcmsSt || 0,
            data_saida_entrada: invoice.entryExitAt || null,
            natureza_operacao: invoice.operationNature || null,
            modelo: invoice.model || null,
            protocolo: invoice.protocol || null,
            informacoes_adicionais: invoice.additionalInfo || null,
            documento_original_path: invoice.originalDocumentPath || null,
            documento_original_mime: invoice.originalDocumentMime || null,
            origem_importacao: invoice.originalDocumentPath ? 'documento' : 'xml',
            extraction_warnings: invoice.extractionWarnings || [],
            extraction_confidence: invoice.extractionConfidence || {},
            extraction_status: invoice.extractionStatus || 'completed',
            extraction_processed_at: invoice.processedAt || null,
            extraction_ai_model: invoice.aiModel || null,
            raw_extraction: invoice.rawExtraction || null,
            valor_total: invoice.totalInvoice || 0,
            status_recebimento: invoice.status === 'received' ? 'recebida' : invoice.status === 'manifested' ? 'manifestada' : 'pendente',
            receipt_id: invoice.receiptId || null,
            xml_conteudo: invoice.rawXml || null,
            itens: invoice.items || [],
            updated_at: new Date().toISOString(),
        };

        const onConflict = accessKey.length === 44 ? 'chave_acesso' : 'id';
        const { error } = await supabase.from('inbound_invoices').upsert(payload, { onConflict });
        if (error) {
            console.warn('Alerta upsert Supabase:', error);
        } else if (Array.isArray(invoice.items) && invoice.items.length > 0) {
            // Sincronizar itens na tabela normalizada inbound_invoice_items
            try {
                const itemRows = invoice.items.map((item, idx) => {
                    const desc = item.productDescription || (item as any).descricao || (item as any).xProd || 'Item sem descrição';
                    const code = item.productCode || (item as any).codigo || (item as any).cProd || '';
                    const qty = Number(item.quantity ?? (item as any).quantidade ?? 0);
                    const uCost = Number(item.unitCost ?? (item as any).valorUnitario ?? (item as any).valor_unitario ?? 0);
                    const tCost = Number(item.totalCost ?? (item as any).valorTotal ?? (item as any).valor_total ?? (qty * uCost));

                    return {
                        inbound_invoice_id: validId,
                        item_index: Number(item.itemNumber ?? (item as any).numeroItem ?? idx + 1),
                        codigo_produto: String(code),
                        descricao: String(desc),
                        ncm: item.ncm || null,
                        cfop: item.cfop || null,
                        unidade: item.unit || (item as any).unidade || 'UN',
                        quantidade: qty,
                        valor_unitario: uCost,
                        valor_total: tCost,
                        valor_desconto: Number(item.discountValue ?? (item as any).valorDesconto ?? 0),
                        valor_frete: Number(item.freightValue ?? (item as any).valorFrete ?? 0),
                        valor_seguro: Number(item.insuranceValue ?? (item as any).valorSeguro ?? 0),
                        outras_despesas: Number(item.otherExpensesValue ?? (item as any).outrasDespesas ?? 0),
                        item_snapshot: {
                            ...item,
                            productDescription: desc,
                            productCode: code,
                            quantity: qty,
                            unitCost: uCost,
                            totalCost: tCost,
                        },
                    };
                });
                await supabase.from('inbound_invoice_items').upsert(itemRows, { onConflict: 'inbound_invoice_id,item_index' });
            } catch (itemErr) {
                console.warn('Alerta ao persistir itens normalizados em inbound_invoice_items:', itemErr);
            }
        }
    } catch (err) {
        console.warn('Erro ao salvar no Supabase, mantido em cache local:', err);
    }

    return invoiceToSave;
};

export const importInboundInvoiceXml = async (xmlString: string): Promise<InboundInvoice> => {
    const parsed = parseInboundNfeXml(xmlString);
    return await saveInboundInvoice(parsed);
};

export const markInvoiceAsReceived = async (nfeKey: string, receiptId: string): Promise<void> => {
    const local = getLocalInvoices();
    const invoice = local.find((inv) => inv.nfeKey === nfeKey);
    if (invoice) {
        invoice.status = 'received';
        invoice.receiptId = receiptId;
        invoice.receivedAt = new Date().toISOString();
        await saveInboundInvoice(invoice);
    }
};

export const syncSefazDfe = async (options?: { forceMock?: boolean }): Promise<{ newInvoicesCount: number; updatedInvoicesCount: number; message: string }> => {
    try {
        const { data, error } = await supabase.functions.invoke('sefaz-inbound-sync', {
            body: { environment: 'production' }
        });

        if (!error && data?.success) {
            saveLastInboundInvoiceSyncAt(new Date().toISOString());
            return {
                newInvoicesCount: data.newDocsCount || 0,
                updatedInvoicesCount: 0,
                message: data.message || 'Sincronização executada com sucesso.'
            };
        }
    } catch (edgeError) {
        console.warn('Sincronização SEFAZ indisponível:', edgeError);
    }

    return {
        newInvoicesCount: 0,
        updatedInvoicesCount: 0,
        message: 'Consulta SEFAZ finalizada.'
    };
};

