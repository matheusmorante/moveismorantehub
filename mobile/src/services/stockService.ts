import { supabase } from './supabaseClient';
import type { InvoiceDateFilter } from '../features/stock/types/stock.types';
import { buildInboundInvoiceSearchFilter, getInvoiceDateBounds, hasUnlinkedInvoiceItems, normalizeInvoiceStatus } from '../features/stock/invoices/utils/invoiceList';
import { parseInboundNfeXml } from '../features/stock/invoices/utils/inboundXmlParser';

export const ITEMS_PER_PAGE = 15;
const INVENTORY_SCOPE_PAGE_SIZE = 100;
const inventoryScopeCache = new Map<string, any[]>();
const getStockPeriod = (startDate?: string, endDate?: string) => ({
    start: startDate,
    end: endDate,
});

/**
 * Movimentações de Estoque
 */
export const fetchStockMoves = async (page: number, productId?: string, startDate?: string, endDate?: string) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const period = getStockPeriod(startDate, endDate);
    
    // In MoranteHub, inventory_moves usually has product details embedded or linked via productId
    let query = supabase
        .from('inventory_moves')
        .select('id, product_id, variation_id, type, quantity, unit_cost, date, created_at, label, observation', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (period.start) query = query.gte('created_at', period.start);
    if (period.end) query = query.lte('created_at', period.end);
        
    if (productId) {
        query = query.eq('product_id', productId);
    }
        
    const { data, error, count } = await query;
        
    if (error) throw error;
    return { data, totalCount: count || 0 };
};

/**
 * Fornecedores
 */
export const fetchSuppliers = async (page: number, searchQuery: string = '') => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    let query = supabase
        .from('people')
        .select('*')
        .eq('person_type', 'suppliers')
        .eq('deleted', false)
        .order('full_name', { ascending: true })
        .range(from, to);
        
    if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,cpf_cnpj.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(s => ({
        ...s,
        // Aliases para compatibilidade com o mapper do useSuppliers
        name: s.full_name || '',
        document_number: s.cpf_cnpj || '',
        city: s.full_address?.city || s.full_address?.cidade || '',
        state: s.full_address?.state || s.full_address?.estado || '',
    }));
};

export const saveSupplier = async (supplier: any) => {
    const { id, ...dataToSave } = supplier;
    dataToSave.person_type = 'suppliers';
    dataToSave.active = dataToSave.active !== undefined ? dataToSave.active : true;
    
    if (id) {
        const { data, error } = await supabase
            .from('people')
            .update(dataToSave)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('people')
            .insert(dataToSave)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

export const fetchSupplierProductCounts = async () => {
    const { data, error } = await supabase
        .from('products')
        .select('id, supplier_id, main_supplier_id, supplier_ids')
        .eq('deleted', false)
        .eq('item_type', 'product');
    
    if (error) {
        console.error('Não foi possível carregar os produtos dos fornecedores:', error);
        return {};
    }
    
    const counts: Record<string, number> = {};
    (data || []).forEach((product) => {
        const supplierIds = new Set([...(product.supplier_ids || []), product.main_supplier_id, product.supplier_id].filter(Boolean));
        supplierIds.forEach((supplierId) => { counts[String(supplierId)] = (counts[String(supplierId)] || 0) + 1; });
    });
    return counts;
};

export const fetchInventoryScopeSuppliers = async () => {
    const { data, error } = await supabase
        .from('people')
        .select('id, full_name')
        .eq('person_type', 'suppliers')
        .eq('deleted', false)
        .order('full_name', { ascending: true })
        .range(0, 99);
    if (error) throw error;
    return data || [];
};

export const fetchInventoryScopeProducts = async (_scope: 'full' | 'supplier', _supplierId?: string) => {
    // Both scopes must use the same complete product catalog: a supplier can be
    // registered as primary, secondary, or in supplier_ids.
    const cacheKey = 'inventory-scope:all';
    const cached = inventoryScopeCache.get(cacheKey);
    if (cached) return cached;

    const products: any[] = [];
    let page = 0;
    while (true) {
        const from = page * INVENTORY_SCOPE_PAGE_SIZE;
        let query = supabase
            .from('products')
            .select('id, name, description, stock, unit, main_supplier_id, supplier_id, supplier_ids')
            .eq('deleted', false)
            .eq('active', true)
            .eq('item_type', 'product')
            .order('name', { ascending: true })
            .range(from, from + INVENTORY_SCOPE_PAGE_SIZE - 1);

        const { data, error } = await query;
        if (error) throw error;
        products.push(...(data || []));
        if (!data || data.length < INVENTORY_SCOPE_PAGE_SIZE) break;
        page += 1;
    }

    const productIds = products.map((product) => product.id);
    const variationRows: any[] = [];
    for (let offset = 0; offset < productIds.length; offset += INVENTORY_SCOPE_PAGE_SIZE) {
        const ids = productIds.slice(offset, offset + INVENTORY_SCOPE_PAGE_SIZE);
        let variationPage = 0;
        while (true) {
            const from = variationPage * INVENTORY_SCOPE_PAGE_SIZE;
            const { data, error } = await supabase
                .from('product_variations')
                .select('id, product_id, name, stock')
                .in('product_id', ids)
                .order('name', { ascending: true })
                .range(from, from + INVENTORY_SCOPE_PAGE_SIZE - 1);
            if (error) throw error;
            variationRows.push(...(data || []));
            if (!data || data.length < INVENTORY_SCOPE_PAGE_SIZE) break;
            variationPage += 1;
        }
    }

    const variationsByProduct = new Map<string, any[]>();
    for (const variation of variationRows) {
        const key = String(variation.product_id);
        variationsByProduct.set(key, [...(variationsByProduct.get(key) || []), variation]);
    }

    const scopedProducts = products.flatMap((product) => {
        const productVariations = variationsByProduct.get(String(product.id)) || [];
        if (!productVariations.length) return [product];
        return productVariations.map((variation) => ({
            ...product,
            id: product.id,
            variation_id: String(variation.id),
            name: variation.name || product.name || product.description,
            stock: variation.stock ?? 0,
        }));
    });

    inventoryScopeCache.set(cacheKey, scopedProducts);
    return scopedProducts;
};

export const clearInventoryScopeCache = () => inventoryScopeCache.clear();

/**
 * Pedidos de Compra
 */
export const fetchPurchases = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) throw error;
    
    // Map to camelCase for the UI
    return (data || []).map(p => ({
        ...p,
        supplierName: p.supplier_name,
        totalValue: p.total_value,
        purchaseNumber: p.purchase_number
    }));
};

/**
 * Notas Fiscais de Entrada
 */
export const fetchInboundInvoices = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('inbound_invoices')
        .select('*, inbound_invoice_items(*)')
        .order('data_emissao', { ascending: false })
        .range(from, to);
        
    if (error) {
        console.warn('Erro ao buscar NFs:', error);
        return [];
    }
    return data;
};

export const fetchInboundInvoicesPage = async ({ page, searchTerm, dateFilter }: {
    page: number;
    searchTerm: string;
    dateFilter: InvoiceDateFilter;
}) => {
    const trimmedSearch = searchTerm.trim();
    const cleanNumber = trimmedSearch.replace(/\D/g, '');
    const isAccessKey = cleanNumber.length === 44;
    const dateBounds = getInvoiceDateBounds(dateFilter);
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
        .from('inbound_invoices')
        .select('id,numero_nfe,serie,chave_acesso,emitente_nome,emitente_cnpj,data_emissao,valor_total,status_recebimento,itens,inbound_invoice_items(*)', { count: 'exact' });

    if (!isAccessKey && dateBounds) {
        query = query.gte('data_emissao', dateBounds.start).lte('data_emissao', dateBounds.end);
    }

    if (trimmedSearch) {
        if (isAccessKey) {
            query = query.eq('chave_acesso', cleanNumber);
        } else {
            const searchFilter = buildInboundInvoiceSearchFilter(trimmedSearch);
            if (searchFilter) query = query.or(searchFilter);
        }
    }

    const { data, error, count } = await query
        .order('data_emissao', { ascending: false })
        .range(from, to);

    if (error) throw error;

    const invoices = (data || []).map((row: any) => {
        const linkedItems = Array.isArray(row.inbound_invoice_items)
            ? row.inbound_invoice_items.map((item: any) => ({ ...item.raw_item, ...item }))
            : [];
        const legacyItems = Array.isArray(row.itens) ? row.itens : [];
        const items = linkedItems.length ? linkedItems : legacyItems;

        return {
            id: row.id,
            number: String(row.numero_nfe || ''),
            series: String(row.serie || '1'),
            accessKey: row.chave_acesso || '',
            supplierName: row.emitente_nome || 'Fornecedor Desconhecido',
            supplierCnpj: row.emitente_cnpj || '',
            issueDate: row.data_emissao || '',
            totalValue: Number(row.valor_total || 0),
            itemsCount: items.length,
            status: normalizeInvoiceStatus(row.status_recebimento),
            hasPendingBindings: hasUnlinkedInvoiceItems(items),
            sefazStatus: 'pending' as const,
        };
    });

    return { invoices, totalCount: count || 0, totalPages: Math.max(1, Math.ceil((count || 0) / ITEMS_PER_PAGE)) };
};

export const fetchInboundInvoiceDetails = async (invoiceId: string) => {
    const { data, error } = await supabase
        .from('inbound_invoices')
        .select('id,numero_nfe,serie,chave_acesso,emitente_nome,emitente_cnpj,emitente_ie,destinatario_nome,destinatario_cnpj,data_emissao,data_saida_entrada,natureza_operacao,modelo,protocolo,informacoes_adicionais,valor_produtos,valor_frete,valor_ipi,valor_desconto,valor_seguro,outras_despesas,valor_icms,valor_icms_st,valor_total,status_recebimento,xml_conteudo,updated_at,itens,inbound_invoice_items(*)')
        .eq('id', invoiceId)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Nota fiscal de entrada não encontrada.');

    const rows = Array.isArray(data.inbound_invoice_items) ? data.inbound_invoice_items : [];
    const legacyItems = Array.isArray(data.itens) ? data.itens : [];
    const sourceItems = rows.length
        ? rows.map((item: any) => ({ ...(item.raw_item || {}), ...item }))
        : legacyItems;
    const items = sourceItems.map((item: any) => ({
        description: item.product_description || item.productDescription || item.descricao || item.xProd || 'Item sem descrição',
        productCode: String(item.product_code || item.productCode || item.codigo_produto || item.cProd || ''),
        ean: String(item.ean || item.gtin || ''),
        ncm: String(item.ncm || ''),
        cest: String(item.cest || ''),
        cfop: String(item.cfop || ''),
        unit: String(item.unit || item.unidade || 'UN'),
        quantity: Number(item.quantity ?? item.quantidade ?? 0),
        unitCost: Number(item.unit_cost ?? item.unitCost ?? item.valor_unitario ?? 0),
        totalCost: Number(item.total_cost ?? item.totalCost ?? item.valor_total ?? 0),
        freightValue: Number(item.freight_value ?? item.freightValue ?? item.valor_frete ?? 0),
        ipiValue: Number(item.ipi_value ?? item.ipiValue ?? item.valor_ipi ?? 0),
        ipiPercent: Number(item.ipi_percent ?? item.ipiPercent ?? 0),
        icmsValue: Number(item.icms_value ?? item.icmsValue ?? item.valor_icms ?? 0),
        icmsPercent: Number(item.icms_percent ?? item.icmsPercent ?? 0),
        icmsStValue: Number(item.icms_st_value ?? item.icmsStValue ?? item.valor_icms_st ?? 0),
    }));

    return {
        id: data.id,
        number: String(data.numero_nfe || ''),
        series: String(data.serie || '1'),
        accessKey: data.chave_acesso || '',
        supplierName: data.emitente_nome || 'Fornecedor Desconhecido',
        supplierCnpj: data.emitente_cnpj || '',
        emitterIe: data.emitente_ie || undefined,
        issueDate: data.data_emissao || '',
        totalValue: Number(data.valor_total || 0),
        itemsCount: items.length,
        status: normalizeInvoiceStatus(data.status_recebimento),
        hasPendingBindings: hasUnlinkedInvoiceItems(sourceItems),
        sefazStatus: 'pending' as const,
        recipientName: data.destinatario_nome || '',
        recipientCnpj: data.destinatario_cnpj || '',
        receivedAt: data.updated_at || undefined,
        totalProducts: Number(data.valor_produtos || 0),
        totalFreight: Number(data.valor_frete || 0),
        totalIpi: Number(data.valor_ipi || 0),
        totalDiscount: Number(data.valor_desconto || 0),
        totalInsurance: Number(data.valor_seguro || 0),
        totalOtherExpenses: Number(data.outras_despesas || 0),
        totalIcms: Number(data.valor_icms || 0),
        totalIcmsSt: Number(data.valor_icms_st || 0),
        model: data.modelo || undefined,
        protocol: data.protocolo || undefined,
        entryExitAt: data.data_saida_entrada || undefined,
        operationNature: data.natureza_operacao || undefined,
        additionalInfo: data.informacoes_adicionais || undefined,
        freightPercent: Number(data.valor_produtos || 0) > 0 ? Number((Number(data.valor_frete || 0) / Number(data.valor_produtos || 0) * 100).toFixed(4)) : 0,
        ipiPercent: Number(data.valor_produtos || 0) > 0 ? Number((Number(data.valor_ipi || 0) / Number(data.valor_produtos || 0) * 100).toFixed(4)) : 0,
        rawXml: data.xml_conteudo || undefined,
        items,
    };
};

export const deleteInboundInvoice = async (invoiceId: string) => {
    const { error } = await supabase
        .from('inbound_invoices')
        .delete()
        .eq('id', invoiceId);
    if (error) throw error;
};

const normalizeTaxId = (value: unknown) => String(value || '').replace(/\D/g, '');

const formatTaxId = (digits: string) => digits.length === 14
    ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : digits.length === 11
        ? digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
        : digits;

export const findInboundInvoiceSupplier = async (taxId: string, name: string) => {
    const digits = normalizeTaxId(taxId);
    const supplierTypeFilter = 'person_type.ilike.suppliers,person_type.ilike.supplier';

    if (digits.length === 11 || digits.length === 14) {
        const formatted = formatTaxId(digits);
        const { data, error } = await supabase.from('people')
            .select('id, full_name, cpf_cnpj')
            .or(supplierTypeFilter)
            .in('cpf_cnpj', [digits, formatted])
            .order('full_name')
            .limit(20);
        if (error) throw error;
        const exactMatch = (data || []).find((person: any) => normalizeTaxId(person.cpf_cnpj) === digits);
        if (exactMatch) return exactMatch;
    }

    const normalizedName = name.trim();
    if (!normalizedName) return null;
    const { data, error } = await supabase.from('people')
        .select('id, full_name, cpf_cnpj')
        .or(supplierTypeFilter)
        .ilike('full_name', normalizedName)
        .order('full_name')
        .limit(20);
    if (error) throw error;
    return (data || []).find((person: any) => String(person.full_name || '').trim().toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR')) || null;
};

export const importInboundInvoiceXml = async (xml: string) => {
    const invoice = parseInboundNfeXml(xml);
    const accessKey = String(invoice.nfeKey || '').replace(/\D/g, '');
    if (accessKey.length !== 44) throw new Error('Chave de acesso da NF-e inválida.');
    if (String(invoice.model || '').replace(/\D/g, '') === '65') {
        throw new Error('NFC-e (modelo 65) não pode ser cadastrada como NF de Entrada.');
    }

    const { data: existingInvoice, error: duplicateCheckError } = await supabase
        .from('inbound_invoices')
        .select('numero_nfe,serie,emitente_nome')
        .eq('chave_acesso', accessKey)
        .maybeSingle();
    if (duplicateCheckError) throw duplicateCheckError;
    if (existingInvoice) {
        throw new Error(
            `Nota Fiscal Já Cadastrada: NF-e #${existingInvoice.numero_nfe || 'S/N'} · Série ${existingInvoice.serie || '1'} — ${existingInvoice.emitente_nome || 'Emitente não informado'}. A nota existente foi preservada.`,
        );
    }

    let supplierId = invoice.supplierId || null;
    let items = Array.isArray(invoice.items) ? invoice.items : [];
    try {
        const supplier = await findInboundInvoiceSupplier(invoice.emitterCnpj || '', invoice.emitterName || '');
        supplierId = supplier?.id || supplierId;
    } catch (supplierError) {
        console.warn('[importInboundInvoiceXml] Não foi possível localizar o fornecedor; a NF será salva sem associação.', supplierError);
    }

    if (supplierId && items.length) {
        try {
            const mappings = await findInboundSupplierProductCodes(
                supplierId,
                items.map((item: any) => String(item.productCode || '')),
            );
            if (mappings.size) {
                items = items.map((item: any) => {
                    const code = String(item.productCode || '').trim().toLocaleUpperCase('pt-BR');
                    const mapping = mappings.get(code);
                    return mapping ? {
                        ...item,
                        matchedProductId: mapping.productId,
                        matchedVariationId: mapping.variationId,
                        productErpName: mapping.name,
                        linkedProductCode: mapping.sku,
                    } : item;
                });
            }
        } catch (mappingError) {
            console.warn('[importInboundInvoiceXml] Não foi possível reaproveitar vínculos anteriores; a NF será salva sem esses vínculos.', mappingError);
        }
    }

    const payload = {
        chave_acesso: accessKey,
        numero_nfe: Number(String(invoice.nfeNumber || '').replace(/\D/g, '')) || 0,
        serie: invoice.series || '1',
        data_emissao: invoice.issuedAt,
        emitente_cnpj: invoice.emitterCnpj || '',
        emitente_nome: invoice.emitterName || '',
        emitente_fantasia: invoice.emitterTradeName || null,
        emitente_ie: invoice.emitterIe || null,
        emitente_endereco: invoice.emitterAddress || {},
        supplier_id: supplierId,
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
        valor_total: invoice.totalInvoice || 0,
        status_recebimento: 'pendente',
        xml_conteudo: xml,
        itens: items,
        origem_importacao: 'xml',
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('inbound_invoices')
        .upsert(payload, { onConflict: 'chave_acesso' })
        .select('id')
        .single();
    if (error) throw error;

    const itemRows = items.map((item: any, index: number) => ({
        invoice_id: data.id,
        item_number: Number(item.itemNumber) || index + 1,
        product_code: String(item.productCode || ''),
        product_description: String(item.productDescription || 'Item sem descrição'),
        ean: item.ean || null,
        ncm: item.ncm || null,
        cfop: item.cfop || null,
        cest: item.cest || null,
        unit: item.unit || 'UN',
        quantity: Number(item.quantity) || 0,
        unit_cost: Number(item.unitCost) || 0,
        total_cost: Number(item.totalCost) || 0,
        ipi_percent: Number(item.ipiPercent) || 0,
        ipi_value: Number(item.ipiValue) || 0,
        icms_percent: Number(item.icmsPercent) || 0,
        icms_value: Number(item.icmsValue) || 0,
        icms_base_value: Number(item.icmsBaseValue) || 0,
        icms_st_percent: Number(item.icmsStPercent) || 0,
        icms_st_value: Number(item.icmsStValue) || 0,
        icms_st_base_value: Number(item.icmsStBaseValue) || 0,
        freight_value: Number(item.freightValue) || 0,
        insurance_value: Number(item.insuranceValue) || 0,
        discount_value: Number(item.discountValue) || 0,
        other_expenses_value: Number(item.otherExpensesValue) || 0,
        product_id: item.matchedProductId || null,
        variation_id: item.matchedVariationId || null,
        raw_item: item,
    }));

    if (itemRows.length) {
        const { error: itemsError } = await supabase
            .from('inbound_invoice_items')
            .upsert(itemRows, { onConflict: 'invoice_id,item_number' });
        if (itemsError) throw itemsError;
    }

    return {
        id: data.id,
        number: String(invoice.nfeNumber || ''),
        series: String(invoice.series || '1'),
        accessKey,
        supplierName: invoice.emitterTradeName || invoice.emitterName || 'Fornecedor Desconhecido',
        supplierCnpj: invoice.emitterCnpj || '',
        issueDate: invoice.issuedAt || '',
        totalValue: Number(invoice.totalInvoice || 0),
        itemsCount: itemRows.length,
    };
};

export const fetchInboundInvoiceForMappings = async (invoiceId: string) => {
    const { data, error } = await supabase
        .from('inbound_invoices')
        .select('id, numero_nfe, serie, emitente_nome, emitente_cnpj, supplier_id, itens, inbound_invoice_items(item_number, product_code, product_description, product_id, variation_id, raw_item)')
        .eq('id', invoiceId)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Nota fiscal de entrada não encontrada.');

    const invoiceItems = Array.isArray(data.itens) ? data.itens : [];
    const normalizedItems = Array.isArray(data.inbound_invoice_items) ? data.inbound_invoice_items : [];
    const items = (invoiceItems.length ? invoiceItems : normalizedItems.map((row: any) => ({
        ...(row.raw_item || {}),
        itemNumber: row.item_number,
        productCode: row.product_code,
        productDescription: row.product_description,
        matchedProductId: row.product_id || undefined,
        matchedVariationId: row.variation_id || undefined,
    }))).map((item: any, index: number) => ({
        ...item,
        itemNumber: Number(item.itemNumber ?? item.item_number ?? index + 1),
        productCode: String(item.productCode ?? item.product_code ?? ''),
        productDescription: String(item.productDescription ?? item.product_description ?? 'Item sem descrição'),
        matchedProductId: item.matchedProductId || item.matched_product_id || undefined,
        matchedVariationId: item.matchedVariationId || item.matched_variation_id || undefined,
    }));

    let supplier = null;
    if (data.supplier_id) {
        const { data: supplierRow, error: supplierError } = await supabase
            .from('people')
            .select('id, full_name, cpf_cnpj')
            .eq('id', data.supplier_id)
            .maybeSingle();
        if (supplierError) throw supplierError;
        supplier = supplierRow;
    }

    return { ...data, supplier, items };
};

export const updateInboundInvoiceMappings = async (
    invoiceId: string,
    supplierId: string | null,
    items: any[],
) => {
    const { error } = await supabase
        .from('inbound_invoices')
        .update({ supplier_id: supplierId, itens: items, updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
    if (error) throw error;
};

export const searchInboundInvoiceSuppliers = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (term.length < 2) return [];
    const { data, error } = await supabase
        .from('people')
        .select('id, full_name, cpf_cnpj')
        .or('person_type.ilike.suppliers,person_type.ilike.supplier')
        .ilike('full_name', `%${term}%`)
        .limit(20);
    if (error) throw error;
    return data || [];
};

export const saveInboundSupplierProductCode = async (supplierId: string, productCode: string, productId: string, description: string, variationId?: string) => {
    const normalizedCode = productCode.trim().toLocaleUpperCase('pt-BR');
    if (!supplierId || !normalizedCode || !productId) return;
    let resolvedProductId = productId;
    let resolvedVariationId = variationId || null;
    if (resolvedVariationId) {
        const { data: canonicalId, error: canonicalError } = await supabase.rpc(
            'resolve_canonical_variation_id',
            { p_variation_id: resolvedVariationId },
        );
        if (canonicalError) throw canonicalError;
        resolvedVariationId = canonicalId || resolvedVariationId;
        const { data: variation, error: variationError } = await supabase
            .from('product_variations')
            .select('product_id')
            .eq('id', resolvedVariationId)
            .single();
        if (variationError) throw variationError;
        resolvedProductId = String(variation.product_id || resolvedProductId);
    }
    const { error } = await supabase.from('product_supplier_codes').upsert({
        supplier_id: supplierId,
        supplier_product_code: normalizedCode,
        product_id: resolvedProductId,
        product_variation_id: resolvedVariationId,
        supplier_description: description || null,
        is_active: true,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'supplier_id,supplier_product_code' });
    if (error) throw error;
};

export const searchInboundInvoiceProducts = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (term.length < 2) return [];

    const [productsResult, variationsResult] = await Promise.all([
        supabase.from('products').select('id, name, code, unit_price').eq('deleted', false).eq('active', true).not('is_draft', 'is', true).or(`name.ilike.%${term}%,code.ilike.%${term}%`).limit(10),
        supabase.from('product_variations').select('id, product_id, name, sku, price, use_parent_price').eq('active', true).or(`name.ilike.%${term}%,sku.ilike.%${term}%`).limit(10),
    ]);
    if (productsResult.error) throw productsResult.error;
    if (variationsResult.error) throw variationsResult.error;

    const variations = variationsResult.data || [];
    const parentIds = [...new Set(variations.map((variation: any) => variation.product_id))];
    const { data: parents, error: parentsError } = parentIds.length
        ? await supabase.from('products').select('id, name, code, unit_price').eq('deleted', false).eq('active', true).not('is_draft', 'is', true).in('id', parentIds)
        : { data: [], error: null };
    if (parentsError) throw parentsError;

    const parentById = new Map((parents || []).map((parent: any) => [String(parent.id), parent]));
    return [
        ...(productsResult.data || []).map((product: any) => ({ ...product, sku: product.code, productId: String(product.id), sellingPrice: Number(product.unit_price || 0) })),
        ...variations.map((variation: any) => ({
            id: String(variation.id),
            productId: String(variation.product_id),
            variationId: String(variation.id),
            name: variation.name,
            sku: variation.sku,
            sellingPrice: Number(variation.use_parent_price ? parentById.get(String(variation.product_id))?.unit_price || 0 : variation.price || 0),
        })),
    ];
};

export const getInboundInvoiceProductById = async (productId: string, preferredVariationName?: string) => {
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, code, unit_price, product_variations(id, product_id, name, sku, price, use_parent_price)')
        .eq('id', productId)
        .single();
    if (productError) throw productError;
    const variations = Array.isArray(product.product_variations) ? product.product_variations : [];
    const variation = preferredVariationName
        ? variations.find((candidate: any) => String(candidate.name || '').trim() === preferredVariationName.trim()) || variations[variations.length - 1]
        : variations[0];
    return {
        id: String(variation?.id || product.id),
        productId: String(product.id),
        variationId: variation?.id ? String(variation.id) : undefined,
        name: variation?.name || product.name,
        sku: variation?.sku || product.code || '',
        sellingPrice: Number(variation?.use_parent_price ? product.unit_price : (variation?.price ?? product.unit_price)) || 0,
    };
};

export const fetchInboundInvoiceProductDetails = async (links: Array<{ productId?: string; variationId?: string }>) => {
    const normalizedLinks = links.filter((link) => link.productId || link.variationId);
    const storedVariationIds = [...new Set(normalizedLinks.map((link) => link.variationId).filter(Boolean).map(String))];
    const canonicalEntries = await Promise.all(storedVariationIds.map(async (variationId) => {
        const { data, error } = await supabase.rpc('resolve_canonical_variation_id', { p_variation_id: variationId });
        if (error) throw error;
        return [variationId, String(data || variationId)] as const;
    }));
    const canonicalByStoredId = new Map(canonicalEntries);
    const canonicalVariationIds = [...new Set(canonicalEntries.map(([, id]) => id))];
    const { data: variations, error: variationsError } = canonicalVariationIds.length
        ? await supabase.from('product_variations').select('id, product_id, name, sku, price, use_parent_price').in('id', canonicalVariationIds)
        : { data: [], error: null };
    if (variationsError) throw variationsError;
    const variationById = new Map<string, any>((variations || []).map((variation: any) => [String(variation.id), variation]));
    const parentIds = [...new Set([
        ...normalizedLinks.map((link) => link.productId).filter(Boolean).map(String),
        ...(variations || []).map((variation: any) => String(variation.product_id)),
    ])];
    const { data: parents, error: parentsError } = parentIds.length
        ? await supabase.from('products').select('id, name, code, unit_price').in('id', parentIds)
        : { data: [], error: null };
    if (parentsError) throw parentsError;
    const parentById = new Map<string, any>((parents || []).map((parent: any) => [String(parent.id), parent]));
    const result = new Map<string, any>();
    normalizedLinks.forEach((link) => {
        const variationId = link.variationId
            ? canonicalByStoredId.get(String(link.variationId)) || String(link.variationId)
            : undefined;
        const variation = variationById.get(variationId || '');
        const productId = String(variation?.product_id || link.productId || '');
        const parent = parentById.get(productId);
        if (!productId || !parent) return;
        const details = {
            productId,
            variationId: variation?.id ? String(variation.id) : undefined,
            name: variation?.name || parent.name || 'Produto vinculado',
            sku: variation?.sku || parent.code || '',
            sellingPrice: Number(variation?.use_parent_price ? parent.unit_price : (variation?.price ?? parent.unit_price)) || 0,
        };
        result.set(`${productId}:${details.variationId || ''}`, details);
        result.set(`${String(link.productId || productId)}:${String(link.variationId || '')}`, details);
    });
    return result;
};

export const searchInboundInvoiceProductParents = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (term.length < 2) return [];
    const { data, error } = await supabase.from('products')
        .select('id, name, code, unit_price, cost_price, category, category_id, description, main_supplier_id, supplier_id, supplier_ids, has_variations, active, deleted, is_draft, product_variations(id, name, sku, price, cost_price, stock, status, active, attributes, images, combo_items, item_type)')
        .eq('deleted', false)
        .eq('active', true)
        .not('is_draft', 'is', true)
        .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
        .order('name')
        .limit(20);
    if (error) throw error;
    return data || [];
};

export const fetchInboundInvoiceSupplierCatalog = async (supplierId: string) => {
    if (!supplierId) return [];
    const pageSize = 100;
    const rows: any[] = [];
    for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase.from('products')
            .select('id, name, description, code, unit_price, product_variations(id, product_id, name, sku, price, use_parent_price, active)')
            .eq('deleted', false)
            .eq('active', true)
            .not('is_draft', 'is', true)
            .or(`supplier_id.eq.${supplierId},main_supplier_id.eq.${supplierId},supplier_ids.cs.{"${supplierId}"}`)
            .order('id')
            .range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
    }
    return rows.flatMap((parent: any) => {
        const variations = parent.product_variations || [];
        if (variations.length) return variations.map((variation: any) => ({
            id: String(variation.id),
            productId: String(parent.id),
            variationId: String(variation.id),
            name: String(variation.name || parent.name),
            comparisonName: `${String(parent.name || parent.description || '')} ${String(variation.name || '')}`.trim(),
            sku: variation.sku || parent.code || '',
            sellingPrice: Number(variation.use_parent_price ? parent.unit_price : (variation.price ?? parent.unit_price)) || 0,
        }));
        return [{ id: String(parent.id), productId: String(parent.id), name: String(parent.name || parent.description || ''), comparisonName: String(parent.name || parent.description || ''), sku: parent.code || '', sellingPrice: Number(parent.unit_price) || 0 }];
    });
};

export const findInboundSupplierProductCodes = async (supplierId: string, productCodes: string[]) => {
    const codes = [...new Set(productCodes.map((code) => code.trim().toLocaleUpperCase('pt-BR')).filter(Boolean))];
    if (!supplierId || codes.length === 0) return new Map<string, any>();
    const { data, error } = await supabase
        .from('product_supplier_codes')
        .select('supplier_product_code, product_id, product_variation_id')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .in('supplier_product_code', codes);
    if (error) throw error;

    const rows = data || [];
    const storedVariationIds = [...new Set(rows.map((row: any) => row.product_variation_id).filter(Boolean).map(String))];
    const canonicalEntries = await Promise.all(storedVariationIds.map(async (variationId) => {
        const { data: canonicalId, error: canonicalError } = await supabase.rpc(
            'resolve_canonical_variation_id',
            { p_variation_id: variationId },
        );
        if (canonicalError) throw canonicalError;
        return [variationId, String(canonicalId || variationId)] as const;
    }));
    const canonicalByStoredId = new Map(canonicalEntries);
    const variationIds = [...new Set(canonicalEntries.map(([, canonicalId]) => canonicalId))];
    const productIds = [...new Set(rows.map((row: any) => String(row.product_id)))];
    const [variationsResult, productsResult] = await Promise.all([
        variationIds.length
            ? supabase.from('product_variations').select('id, product_id, name, sku, price, use_parent_price').in('id', variationIds)
            : Promise.resolve({ data: [], error: null } as any),
        productIds.length
            ? supabase.from('products').select('id, name, code, unit_price').in('id', productIds)
            : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (variationsResult.error) throw variationsResult.error;
    if (productsResult.error) throw productsResult.error;

    const variationById = new Map<string, any>((variationsResult.data || []).map((row: any) => [String(row.id), row]));
    const canonicalProductIds = [...new Set((variationsResult.data || []).map((row: any) => String(row.product_id)).filter((id: string) => !productIds.includes(id)))];
    const { data: canonicalProducts, error: canonicalProductsError } = canonicalProductIds.length
        ? await supabase.from('products').select('id, name, code, unit_price').in('id', canonicalProductIds)
        : { data: [], error: null };
    if (canonicalProductsError) throw canonicalProductsError;
    const productById = new Map<string, any>([...(productsResult.data || []), ...(canonicalProducts || [])].map((row: any) => [String(row.id), row]));
    return new Map(rows.map((row: any) => {
        let variationId = row.product_variation_id
            ? canonicalByStoredId.get(String(row.product_variation_id)) || String(row.product_variation_id)
            : undefined;
        if (variationId) {
            const variation = variationById.get(variationId);
            if (variation?.id) variationId = String(variation.id);
        }
        const productId = String(variationById.get(variationId || '')?.product_id || row.product_id);
        const product = productById.get(productId);
        const variation = variationById.get(variationId || '');
        return [
            row.supplier_product_code.trim().toLocaleUpperCase('pt-BR'),
            {
                productId,
                variationId,
                name: variation?.name || product?.name || 'Produto vinculado',
                sku: variation?.sku || product?.code || '',
                sellingPrice: Number(variation?.use_parent_price ? product?.unit_price : (variation?.price ?? product?.unit_price)) || 0,
            },
        ];
    }));
};

export const deleteInboundSupplierProductCode = async (supplierId: string, productCode: string) => {
    const normalizedCode = productCode.trim().toLocaleUpperCase('pt-BR');
    if (!supplierId || !normalizedCode) return;
    const { error } = await supabase.from('product_supplier_codes')
        .delete()
        .eq('supplier_id', supplierId)
        .eq('supplier_product_code', normalizedCode);
    if (error) throw error;
};

/**
 * Recebimentos (Entregas de fornecedores para conferência)
 */
export const fetchReceipts = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('goods_receipts')
        .select('*, goods_receipt_items(*)')
        .order('received_at', { ascending: false })
        .range(from, to);
        
    if (error) {
        console.warn('Erro ao buscar recebimentos:', error);
        return [];
    }
    
    return (data || []).map(r => ({
        ...r,
        supplierName: r.supplier_name || 'Fornecedor',
        totalValue: r.total_value || 0,
        items: Array.isArray(r.goods_receipt_items) ? r.goods_receipt_items : [],
    }));
};

/**
 * Sessões de Inventário
 */
export const fetchInventorySessions = async (page: number, startDate?: string, endDate?: string) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const period = getStockPeriod(startDate, endDate);
    
    const { data: markerMoves, error } = await supabase
        .from('inventory_moves')
        .select('id, label, observation, quantity, date, created_at, updated_at')
        .ilike('label', 'Inventário #%')
        .gte('created_at', period.start)
        .lte('created_at', period.end)
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) {
        console.warn('Erro ao buscar auditorias de inventário:', error);
        return [];
    }

    if (!markerMoves || markerMoves.length === 0) return [];

    // Collect session codes from labels to fetch their adjustments
    const sessionCodes = markerMoves
        .map(m => {
            try {
                const data = JSON.parse(m.observation || '{}') as any;
                if (data.inventoryCode) return data.inventoryCode;
            } catch {}
            return m.label?.replace('Inventário #', '') || '';
        })
        .filter(Boolean);

    // Fetch adjustment moves to calculate adjustmentsCount and reversedCount
    // We cannot use IN on a like pattern easily, so we just fetch all adjustments and filter in memory since it's paginated on the marker side anyway, OR we construct an OR query
    let adjustmentsData: any[] = [];
    if (sessionCodes.length > 0) {
        const expectedLabels = sessionCodes.map(code => `Ajuste lançado pelo inventário #${code}`);
        const { data, error: adjustmentsError } = await supabase
            .from('inventory_moves')
            .select('label')
            .in('label', expectedLabels);
            
        if (adjustmentsError) {
            console.warn('Erro ao buscar ajustes dos inventários:', adjustmentsError);
        } else {
            adjustmentsData = data || [];
        }
    }

    const adjustmentsBySession = adjustmentsData.reduce((acc: Record<string, { total: number, reversed: number }>, move) => {
        const match = move.label?.match(/Ajuste lançado pelo inventário #(.+)/);
        if (match && match[1]) {
            const code = match[1].trim();
            if (!acc[code]) acc[code] = { total: 0, reversed: 0 };
            acc[code].total += 1;
            // Removed move.status check since status column doesn't exist
        }
        return acc;
    }, {});
    
    // Convert moves into "sessions" for the UI by parsing observation
    return markerMoves.map(m => {
        let productsCount = 0;
        let status = 'in_progress';
        let inventoryCode = m.id.split('-')[0];
        let responsibleName = 'Não informado';
        
        try {
            const data = JSON.parse(m.observation || '{}') as any;
            
            // Extracted from observation if possible, falling back to label
            inventoryCode = data.inventoryCode || m.label?.replace('Inventário #', '') || inventoryCode;
            responsibleName = data.responsibleName || 'Não informado';

            if (data.inventoryAudit && Array.isArray(data.items)) {
                productsCount = data.items.length;
                status = data.status || 'completed';
            } else {
                productsCount = Math.abs(m.quantity || 0); // fallback
            }
        } catch {
            productsCount = Math.abs(m.quantity || 0);
            inventoryCode = m.label?.replace('Inventário #', '') || inventoryCode;
        }

        const sessionAdjustments = adjustmentsBySession[inventoryCode] || { total: 0, reversed: 0 };

        return {
            id: m.id,
            name: `Inventário #${inventoryCode}`,
            inventoryCode,
            responsibleName,
            status: status as 'in_progress' | 'completed' | 'pending',
            created_at: m.created_at || m.date,
            updated_at: m.updated_at || m.date,
            items_count: productsCount, // Keep for fallback
            productsCount,
            adjustmentsCount: sessionAdjustments.total,
            reversedCount: sessionAdjustments.reversed
        };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getNextInventoryCode = async (): Promise<string> => {
    const { data, error } = await supabase
        .from('inventory_moves')
        .select('observation')
        .ilike('label', 'Inventário #%')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw error;
    const lastCode = (data || []).reduce((highest, move: any) => {
        try {
            const obs = JSON.parse(move.observation || '{}');
            const codeNum = Number(obs.inventoryCode);
            return !isNaN(codeNum) ? Math.max(highest, codeNum) : highest;
        } catch {
            return highest;
        }
    }, 0);
    return String(lastCode + 1).padStart(6, '0');
};

/**
 * Itens para contagem do inventário (Paginado)
 */
export const fetchInventoryItems = async (sessionId: string, page: number, searchQuery: string = '') => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    // Aqui seria idealmente a tabela products, para podermos contar todos
    let query = supabase
        .from('products')
        .select('id, name, stock')
        .order('name', { ascending: true })
        .range(from, to);
        
    if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(p => ({
        ...p,
        stock_quantity: p.stock || 0
    }));
};

/**
 * Buscar produtos (para suggestions/search input)
 */
export const searchProducts = async (query: string) => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(10);
        
    if (error) throw error;
    return data;
};

export const fetchInventorySessionDetails = async (sessionId: string) => {
    const { data, error } = await supabase
        .from('inventory_moves')
        .select('observation')
        .eq('id', sessionId)
        .single();
    if (error) throw error;
    try {
        return JSON.parse(data.observation || '{}');
    } catch {
        return {};
    }
};
