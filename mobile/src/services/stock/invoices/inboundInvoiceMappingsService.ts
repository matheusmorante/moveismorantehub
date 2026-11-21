import { supabase } from '../../supabaseClient';
import { parseInboundNfeXml } from '../../../features/stock/invoices/utils/inboundXmlParser';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import {
  getSupplierStockOriginsFromRelation,
  isSalvadosOnlySupplier,
} from '../../../../../shared-utils/productSupplierStockOrigin';
import { markInboundInvoiceItemsNotApplicable } from '../../../../../shared-utils/inboundInvoiceSupplierRules';
import {
  getCurrentInboundInvoiceMappingItems,
  getInboundInvoiceSupplierCodes,
  getInboundSupplierMappingKey,
  normalizeInboundSupplierProductCode,
  type GlobalInboundSupplierItemMapping,
} from '../../../../../shared-utils/inboundInvoiceMappingState';

export const fetchGlobalInboundSupplierItemMappings = async (
  invoiceRows: unknown[]
): Promise<Map<string, GlobalInboundSupplierItemMapping>> => {
  const keys = new Map<string, { supplier_id: string; supplier_product_code: string }>();
  for (const row of invoiceRows) {
    for (const key of getInboundInvoiceSupplierCodes(row)) {
      keys.set(getInboundSupplierMappingKey(key.supplier_id, key.supplier_product_code), key);
    }
  }
  if (!keys.size) return new Map();
  const result = await withTimeout(
    (supabase as any).rpc('find_inbound_supplier_item_mappings', {
      p_keys: [...keys.values()],
    }),
    15_000,
    null,
    'entrada:consultar-vinculos-globais'
  );
  if (!result) throw new Error('A consulta de vínculos globais da NF-e excedeu o prazo.');
  const { data, error } = result;
  if (error) throw error;
  return new Map(
    ((data || []) as unknown as GlobalInboundSupplierItemMapping[]).map((mapping) => [
      getInboundSupplierMappingKey(mapping.supplier_id, mapping.supplier_product_code),
      mapping,
    ])
  );
};

export const fetchInboundInvoiceForMappings = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from('inbound_invoices')
    .select(
      'id, numero_nfe, serie, chave_acesso, data_emissao, emitente_nome, emitente_cnpj, supplier_id, status_recebimento, receipt_id, valor_produtos, valor_frete, valor_ipi, valor_desconto, valor_seguro, outras_despesas, valor_icms_st, itens, xml_conteudo, supplier:people(id, full_name, cpf_cnpj, stock_origins), inbound_invoice_items(item_number, product_code, product_description, product_id, variation_id, raw_item)'
    )
    .eq('id', invoiceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Nota fiscal de entrada não encontrada.');

  const invoiceItems = Array.isArray(data.itens) ? data.itens : [];
  const normalizedItems = Array.isArray(data.inbound_invoice_items)
    ? data.inbound_invoice_items
    : [];
  let items = (
    invoiceItems.length
      ? invoiceItems
      : normalizedItems.map((row: any) => ({
          ...(row.raw_item || {}),
          itemNumber: row.item_number,
          productCode: row.product_code,
          productDescription: row.product_description,
          matchedProductId: row.product_id || undefined,
          matchedVariationId: row.variation_id || undefined,
        }))
  ).map((item: any, index: number) => ({
    ...item,
    itemNumber: Number(item.itemNumber || item.item_number || index + 1),
    productCode: String(item.productCode || item.product_code || ''),
    productDescription: String(
      item.productDescription || item.product_description || 'Item sem descrição'
    ),
    matchedProductId: item.matchedProductId || item.matched_product_id || undefined,
    matchedVariationId: item.matchedVariationId || item.matched_variation_id || undefined,
  }));

  // O ERP repara itens incompletos usando o XML original antes de abrir o gerenciamento.
  if (
    data.xml_conteudo &&
    items.some(
      (item: any) =>
        !item.productDescription ||
        item.productDescription === 'Item sem descrição' ||
        (Number(item.unitCost || 0) === 0 && Number(item.totalCost || 0) === 0)
    )
  ) {
    try {
      const parsed = parseInboundNfeXml(data.xml_conteudo);
      if (parsed.items?.length) {
        items = parsed.items.map((xmlItem: any) => {
          const existing = items.find(
            (current: any) => current.itemNumber === xmlItem.itemNumber
              && normalizeInboundSupplierProductCode(current.productCode) === normalizeInboundSupplierProductCode(xmlItem.productCode)
          );
          return {
            ...xmlItem,
            matchedProductId: existing?.matchedProductId || xmlItem.matchedProductId,
            matchedVariationId: existing?.matchedVariationId || xmlItem.matchedVariationId,
            productErpName: existing?.productErpName || xmlItem.productErpName,
            linkedProductCode: existing?.linkedProductCode || xmlItem.linkedProductCode,
            sellingPrice: existing?.sellingPrice ?? xmlItem.sellingPrice,
            linkMode: existing?.linkMode || xmlItem.linkMode,
            compositionLinks:
              existing?.compositionLinks ||
              existing?.composition_links ||
              xmlItem.compositionLinks ||
              xmlItem.composition_links,
          };
        });
      }
    } catch (repairError) {
      console.warn('[StockInvoiceService] Não foi possível reparar itens pelo XML:', repairError);
    }
  }

  const relatedSupplier = Array.isArray(data.supplier) ? data.supplier[0] : data.supplier;
  let supplier = relatedSupplier && typeof relatedSupplier === 'object' ? relatedSupplier : null;
  if (data.supplier_id && !supplier) {
    // Keep the previous lookup as a safeguard if the embedded relation is absent.
    const { data: supplierRow, error: supplierError } = await supabase
      .from('people')
      .select('id, full_name, cpf_cnpj, stock_origins')
      .eq('id', data.supplier_id)
      .maybeSingle();
    if (supplierError) throw supplierError;
    supplier = supplierRow;
  }

  const joinedSupplierOrigins = getSupplierStockOriginsFromRelation(data.supplier);
  const supplierStockOrigins = Array.isArray(supplier?.stock_origins)
    ? supplier.stock_origins
    : joinedSupplierOrigins;

  const globalMappings = await fetchGlobalInboundSupplierItemMappings([
    { ...data, itens: items },
  ]);
  const mappingItems = getCurrentInboundInvoiceMappingItems(
    { ...data, itens: items },
    globalMappings
  );
  items = items.map((item: any) => {
    const current = mappingItems.find((mapping: any) =>
      mapping.itemNumber === item.itemNumber
        && normalizeInboundSupplierProductCode(mapping.productCode) === normalizeInboundSupplierProductCode(item.productCode)
    );
    if (!current) return item;
    return {
      ...item,
      matchedProductId: current.matchedProductId,
      matchedVariationId: current.matchedVariationId,
      productErpName: current.productErpName,
      linkedProductCode: current.linkedProductCode,
      sellingPrice: current.sellingPrice,
      linkMode: current.linkMode,
      inheritedSupplierLink: current.inheritedSupplierLink,
      compositionLinks: current.compositionLinks || [],
    };
  });

  if (isSalvadosOnlySupplier(supplierStockOrigins)) {
    items = markInboundInvoiceItemsNotApplicable(items);
  }

  let receiptHistoryItems: any[] = [];
  if (['recebida', 'received'].includes(String(data.status_recebimento || '').toLocaleLowerCase('pt-BR')) && data.receipt_id) {
    const { data: historyRows, error: historyError } = await supabase
      .from('goods_receipt_items')
      .select('item_index, product_id, variation_id, description, quantity, item_snapshot')
      .eq('receipt_id', data.receipt_id)
      .order('item_index', { ascending: true });
    if (historyError) throw historyError;
    receiptHistoryItems = (historyRows || []).map((row: any) => ({
      itemIndex: Number(row.item_index),
      productId: row.product_id || undefined,
      variationId: row.variation_id || undefined,
      description: String(row.description || 'Item sem descrição'),
      quantity: Number(row.quantity || 0),
      snapshot: row.item_snapshot && typeof row.item_snapshot === 'object' ? row.item_snapshot : {},
    }));
  }

  return { ...data, supplier, supplierStockOrigins, items, receiptHistoryItems };
};

const saveGlobalInboundSupplierItemMapping = async (mapping: {
  supplierId: string;
  supplierProductCode: string;
  linkMode: 'single' | 'composition' | 'not_applicable' | 'unlinked';
  productId?: string;
  variationId?: string;
  components?: Array<{ productId: string; variationId?: string; quantityMultiplier: number }>;
  supplierDescription?: string;
}) => {
  const supplierProductCode = normalizeInboundSupplierProductCode(mapping.supplierProductCode);
  const result = await withTimeout(
    (supabase as any).rpc('save_inbound_supplier_item_mapping', {
      p_supplier_id: mapping.supplierId,
      p_supplier_product_code: supplierProductCode,
      p_link_mode: mapping.linkMode,
      p_product_id: mapping.linkMode === 'single' ? mapping.productId || null : null,
      p_variation_id: mapping.linkMode === 'single' ? mapping.variationId || null : null,
      p_components: mapping.linkMode === 'composition' ? mapping.components || [] : [],
      p_supplier_description: mapping.supplierDescription?.trim() || null,
    }),
    20_000,
    null,
    'entrada:salvar-vinculo-global'
  );
  if (!result) throw new Error('A gravação do vínculo global excedeu o prazo. Consulte novamente antes de repetir.');
  const { data, error } = result;
  if (error) throw error;
  if (!data?.id || data.supplier_id !== mapping.supplierId || data.supplier_product_code !== supplierProductCode || data.link_mode !== mapping.linkMode) {
    throw new Error('A gravação do vínculo global não foi confirmada pelo servidor.');
  }
  return data;
};

export const updateInboundInvoiceMappings = async (
  invoiceId: string,
  supplierId: string | null,
  items: any[],
  changedItemNumbers: number[] = []
) => {
  if (!invoiceId) throw new Error('Selecione uma nota fiscal válida.');
  const { data: currentInvoice, error: currentInvoiceError } = await supabase
    .from('inbound_invoices')
    .select('id, supplier_id, status_recebimento, supplier:people(stock_origins)')
    .eq('id', invoiceId)
    .maybeSingle();
  if (currentInvoiceError) throw currentInvoiceError;
  if (!currentInvoice || String(currentInvoice.id) !== String(invoiceId)) {
    throw new Error('A nota fiscal não está mais disponível para editar os vínculos.');
  }

  const currentSupplierId = currentInvoice.supplier_id || null;
  const received = ['recebida', 'received'].includes(
    String(currentInvoice.status_recebimento || '').toLocaleLowerCase('pt-BR')
  );
  if (received && currentSupplierId !== (supplierId || null)) {
    throw new Error('O fornecedor não pode ser alterado depois que a nota foi recebida.');
  }

  const currentOrigins = getSupplierStockOriginsFromRelation(currentInvoice.supplier);
  const currentIsSalvados = isSalvadosOnlySupplier(currentOrigins);
  let effectiveSupplierId = currentIsSalvados ? currentSupplierId || supplierId : supplierId;
  let targetOrigins = currentIsSalvados ? currentOrigins : undefined;
  if (!targetOrigins && effectiveSupplierId) {
    const { data: targetSupplier, error: targetSupplierError } = await supabase
      .from('people')
      .select('stock_origins')
      .eq('id', effectiveSupplierId)
      .maybeSingle();
    if (targetSupplierError) throw targetSupplierError;
    targetOrigins = Array.isArray(targetSupplier?.stock_origins) ? targetSupplier.stock_origins : undefined;
  }
  const isSalvadosSupplier = isSalvadosOnlySupplier(targetOrigins);
  if (isSalvadosSupplier && !effectiveSupplierId) effectiveSupplierId = currentSupplierId || supplierId;

  if (currentSupplierId !== (effectiveSupplierId || null)) {
    const { data: savedHeader, error: headerError } = await supabase
      .from('inbound_invoices')
      .update({ supplier_id: effectiveSupplierId || null, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .select('id, supplier_id')
      .maybeSingle();
    if (
      headerError ||
      !savedHeader ||
      String(savedHeader.id) !== String(invoiceId) ||
      (savedHeader.supplier_id || null) !== (effectiveSupplierId || null)
    ) {
      throw headerError || new Error('A alteração do fornecedor não foi confirmada pelo servidor.');
    }
  }

  let currentItems = isSalvadosSupplier
    ? markInboundInvoiceItemsNotApplicable(items)
    : items.map((item) => ({ ...item }));
  if (!effectiveSupplierId || isSalvadosSupplier) return currentItems;

  const changedSet = new Set(changedItemNumbers.map(Number));
  for (const item of currentItems) {
    if (!changedSet.has(Number(item.itemNumber))) continue;
    const code = normalizeInboundSupplierProductCode(item.productCode);
    if (!code) throw new Error('O item ' + item.itemNumber + ' não possui o código completo do fornecedor.');
    const linkMode = item.linkMode === 'composition'
      ? 'composition'
      : item.linkMode === 'not_applicable'
        ? 'not_applicable'
        : item.linkMode === 'unlinked' || (!item.matchedProductId && !item.compositionLinks?.length)
          ? 'unlinked'
          : 'single';
    if (linkMode === 'composition' && !item.compositionLinks?.length) {
      throw new Error('Adicione ao menos um componente antes de salvar o modo Composto.');
    }
    await saveGlobalInboundSupplierItemMapping({
      supplierId: effectiveSupplierId,
      supplierProductCode: code,
      supplierDescription: item.productDescription,
      linkMode,
      productId: linkMode === 'single' ? item.matchedProductId : undefined,
      variationId: linkMode === 'single' ? item.matchedVariationId : undefined,
      components: linkMode === 'composition'
        ? (item.compositionLinks || []).map((component: any) => ({
            productId: String(component.productId || component.product_id || ''),
            variationId: component.variationId || component.variation_id || undefined,
            quantityMultiplier: Number(component.quantityMultiplier ?? component.quantity_multiplier ?? 1),
          }))
        : [],
    });
  }

  const globalMappings = await fetchGlobalInboundSupplierItemMappings([
    { supplier_id: effectiveSupplierId, itens: currentItems },
  ]);
  const mappingItems = getCurrentInboundInvoiceMappingItems(
    { supplier_id: effectiveSupplierId, itens: currentItems },
    globalMappings
  );
  return currentItems.map((item: any) => {
    const mapping = mappingItems.find((candidate: any) =>
      candidate.itemNumber === Number(item.itemNumber) &&
      normalizeInboundSupplierProductCode(candidate.productCode) === normalizeInboundSupplierProductCode(item.productCode)
    );
    if (!mapping) return item;
    return {
      ...item,
      matchedProductId: mapping.matchedProductId,
      matchedVariationId: mapping.matchedVariationId,
      productErpName: mapping.productErpName,
      linkedProductCode: mapping.linkedProductCode,
      sellingPrice: mapping.sellingPrice,
      linkMode: mapping.linkMode,
      inheritedSupplierLink: mapping.inheritedSupplierLink,
      compositionLinks: mapping.compositionLinks || [],
    };
  });
};
export const saveInboundSupplierProductCode = async (
  supplierId: string,
  productCode: string,
  productId: string,
  description: string,
  variationId?: string
) => {
  const normalizedCode = normalizeInboundSupplierProductCode(productCode);
  if (!supplierId || !normalizedCode || !productId) return;
  await saveGlobalInboundSupplierItemMapping({
    supplierId,
    supplierProductCode: normalizedCode,
    productId,
    variationId,
    supplierDescription: description,
    linkMode: 'single',
  });
};

export const findInboundSupplierItemMappings = async (
  supplierId: string,
  productCodes: string[]
) => {
  const codes = [...new Set(productCodes.map(normalizeInboundSupplierProductCode).filter(Boolean))];
  if (!supplierId || codes.length === 0) return new Map<string, GlobalInboundSupplierItemMapping>();
  const rows = codes.map((productCode) => ({
    supplier_id: supplierId,
    productCode,
  }));
  const globalMappings = await fetchGlobalInboundSupplierItemMappings(
    rows.map((row) => ({ supplier_id: row.supplier_id, itens: [{ productCode: row.productCode }] }))
  );
  return new Map(
    codes.flatMap((code) => {
      const mapping = globalMappings.get(getInboundSupplierMappingKey(supplierId, code));
      return mapping ? [[code, mapping] as const] : [];
    })
  );
};

export const findInboundSupplierProductCodes = async (
  supplierId: string,
  productCodes: string[]
) => {
  const mappings = await findInboundSupplierItemMappings(supplierId, productCodes);
  return new Map(
    [...mappings.entries()]
      .filter(([, mapping]) => mapping.link_mode === 'single' && Boolean(mapping.product_id))
      .map(([code, mapping]) => [
        code,
        {
          productId: String(mapping.product_id),
          variationId: mapping.variation_id || undefined,
          name: mapping.product_name || 'Produto vinculado',
          sku: mapping.product_sku || '',
          sellingPrice: Number(mapping.selling_price || 0),
          supplierDescription: mapping.supplier_description || undefined,
        },
      ])
  );
};

export const deleteInboundSupplierProductCode = async (supplierId: string, productCode: string) => {
  const normalizedCode = normalizeInboundSupplierProductCode(productCode);
  if (!supplierId || !normalizedCode) return;
  await saveGlobalInboundSupplierItemMapping({
    supplierId,
    supplierProductCode: normalizedCode,
    linkMode: 'unlinked',
  });
};
