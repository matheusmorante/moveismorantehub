import { supabase } from '../../supabaseClient';
import { parseInboundNfeXml } from '../../../features/stock/invoices/utils/inboundXmlParser';
import { buildInboundInvoiceItemRows } from './inboundInvoiceMappers';
import {
  getSupplierStockOriginsFromRelation,
  isSalvadosOnlySupplier,
} from '../../../../../shared-utils/productSupplierStockOrigin';
import { markInboundInvoiceItemsNotApplicable } from '../../../../../shared-utils/inboundInvoiceSupplierRules';
import {
  collectInboundInvoiceVariationIds,
  isInboundInvoiceVariationUuid,
  reconcileInboundInvoiceVariationReferences,
} from '../../../../../shared-utils/inboundInvoiceVariationReferences';

export const fetchInboundInvoiceForMappings = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from('inbound_invoices')
    .select(
      'id, numero_nfe, serie, chave_acesso, data_emissao, emitente_nome, emitente_cnpj, supplier_id, status_recebimento, receipt_id, valor_produtos, valor_frete, valor_ipi, valor_desconto, valor_seguro, outras_despesas, valor_icms_st, itens, xml_conteudo, supplier:people(stock_origins), inbound_invoice_items(item_number, product_code, product_description, product_id, variation_id, raw_item)'
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
    itemNumber: Number(item.itemNumber ?? item.item_number ?? index + 1),
    productCode: String(item.productCode ?? item.product_code ?? ''),
    productDescription: String(
      item.productDescription ?? item.product_description ?? 'Item sem descrição'
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
        items = parsed.items.map((xmlItem: any, index: number) => {
          const existing =
            items.find(
              (current: any) =>
                current.itemNumber === xmlItem.itemNumber ||
                (current.productCode && current.productCode === xmlItem.productCode)
            ) || items[index];
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

  let supplier = null;
  if (data.supplier_id) {
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
  if (isSalvadosOnlySupplier(supplierStockOrigins)) {
    items = markInboundInvoiceItemsNotApplicable(items);
  }

  return { ...data, supplier, supplierStockOrigins, items };
};

const canonicalize = (value: unknown) =>
  JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]]))
      : entry
  );

const getMappingState = (item: any) => {
  const rawItem = item?.raw_item && typeof item.raw_item === 'object' ? item.raw_item : {};
  const read = (...keys: string[]) => {
    for (const source of [item || {}, rawItem]) {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
      }
    }
    return undefined;
  };
  const links = read('compositionLinks', 'composition_links') || [];

  return {
    itemNumber: Number(read('itemNumber', 'item_number') || 0),
    matchedProductId: read('matchedProductId', 'matched_product_id', 'product_id') || null,
    matchedVariationId:
      read('matchedVariationId', 'matched_variation_id', 'variation_id') || null,
    linkMode: read('linkMode', 'link_mode') || null,
    compositionLinks: Array.isArray(links)
      ? links
          .map((link: any) => ({
            productId: link.productId || link.product_id || null,
            variationId: link.variationId || link.variation_id || null,
            quantityMultiplier: Number(link.quantityMultiplier ?? link.quantity_multiplier ?? 1),
          }))
          .sort((left, right) =>
            `${left.productId}:${left.variationId}:${left.quantityMultiplier}`.localeCompare(
              `${right.productId}:${right.variationId}:${right.quantityMultiplier}`
            )
          )
      : [],
  };
};

const fetchPersistedMappingState = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from('inbound_invoices')
    .select(
      'id, supplier_id, itens, inbound_invoice_items(invoice_id, item_number, product_id, variation_id, raw_item)'
    )
    .eq('id', invoiceId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const isMappingSnapshotPersisted = (
  invoice: any,
  invoiceId: string,
  supplierId: string | null,
  items: any[]
) => {
  if (
    !invoice ||
    String(invoice.id) !== String(invoiceId) ||
    (invoice.supplier_id || null) !== (supplierId || null) ||
    !Array.isArray(invoice.itens) ||
    canonicalize(invoice.itens.map(getMappingState)) !==
      canonicalize(items.map(getMappingState))
  ) {
    return false;
  }

  const normalizedItems = Array.isArray(invoice.inbound_invoice_items)
    ? invoice.inbound_invoice_items
    : [];
  return items.every((expected) => {
    const normalized = normalizedItems.find(
      (item: any) => Number(item.item_number) === Number(expected.itemNumber)
    );
    return Boolean(
      normalized &&
        String(normalized.invoice_id) === String(invoiceId) &&
        canonicalize([getMappingState(normalized)]) ===
          canonicalize([getMappingState(expected)])
    );
  });
};

export const updateInboundInvoiceMappings = async (
  invoiceId: string,
  supplierId: string | null,
  items: any[]
) => {
  if (!invoiceId) throw new Error('Selecione uma nota fiscal válida.');
  const { data: currentInvoice, error: currentInvoiceError } = await supabase
    .from('inbound_invoices')
    .select('id, supplier_id, supplier:people(stock_origins), inbound_invoice_items(item_number, product_id, variation_id, raw_item)')
    .eq('id', invoiceId)
    .maybeSingle();
  if (currentInvoiceError) throw currentInvoiceError;
  if (!currentInvoice || String(currentInvoice.id) !== String(invoiceId)) {
    throw new Error('A nota fiscal não está mais disponível para editar os vínculos.');
  }

  const currentOrigins = getSupplierStockOriginsFromRelation(currentInvoice?.supplier);
  const currentIsSalvados = isSalvadosOnlySupplier(currentOrigins);
  let effectiveSupplierId = currentIsSalvados
    ? currentInvoice?.supplier_id || supplierId
    : supplierId;
  let targetOrigins = currentIsSalvados ? currentOrigins : undefined;

  if (!targetOrigins && effectiveSupplierId) {
    const { data: targetSupplier, error: targetSupplierError } = await supabase
      .from('people')
      .select('stock_origins')
      .eq('id', effectiveSupplierId)
      .maybeSingle();
    if (targetSupplierError) throw targetSupplierError;
    targetOrigins = Array.isArray(targetSupplier?.stock_origins)
      ? targetSupplier.stock_origins
      : undefined;
  }

  const isSalvadosSupplier = isSalvadosOnlySupplier(targetOrigins);
  if (isSalvadosSupplier && !effectiveSupplierId) {
    effectiveSupplierId = currentInvoice?.supplier_id || supplierId;
  }
  const itemsToPersist = isSalvadosSupplier
    ? markInboundInvoiceItemsNotApplicable(items)
    : items;
  const variationIds = collectInboundInvoiceVariationIds(itemsToPersist);
  const queryableIds = variationIds.filter(isInboundInvoiceVariationUuid);
  const validVariationIds = new Set<string>();
  if (queryableIds.length) {
    const { data: variations, error: variationsError } = await supabase
      .from('product_variations')
      .select('id')
      .in('id', queryableIds);
    if (variationsError) throw variationsError;
    for (const variation of variations || []) {
      if (variation?.id) validVariationIds.add(String(variation.id));
    }
  }
  const persistedItems = reconcileInboundInvoiceVariationReferences(
    itemsToPersist,
    Array.isArray(currentInvoice.inbound_invoice_items)
      ? currentInvoice.inbound_invoice_items
      : [],
    validVariationIds
  );

  const { data: savedInvoice, error } = await supabase
    .from('inbound_invoices')
    .update({ supplier_id: effectiveSupplierId, itens: persistedItems, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select('id, supplier_id, itens')
    .maybeSingle();
  if (
    error ||
    !savedInvoice ||
    String(savedInvoice.id) !== String(invoiceId) ||
    (savedInvoice.supplier_id || null) !== (effectiveSupplierId || null) ||
    canonicalize(savedInvoice.itens) !== canonicalize(persistedItems)
  ) {
    let currentInvoice: any;
    try {
      currentInvoice = await fetchPersistedMappingState(invoiceId);
    } catch (readError) {
      throw error || readError;
    }
    if (
      !currentInvoice ||
      String(currentInvoice.id) !== String(invoiceId) ||
      (currentInvoice.supplier_id || null) !== (effectiveSupplierId || null) ||
      canonicalize(currentInvoice.itens) !== canonicalize(persistedItems)
    ) {
      throw error || new Error('A gravação dos vínculos da nota não foi confirmada pelo servidor.');
    }
  }

  if (persistedItems.length) {
    const itemRows = buildInboundInvoiceItemRows(invoiceId, persistedItems);
    const { data: savedItemRows, error: itemsError } = await supabase
      .from('inbound_invoice_items')
      .upsert(itemRows, { onConflict: 'invoice_id,item_number' })
      .select('invoice_id,item_number');
    const returnedRowsConfirmed =
      !itemsError &&
      Array.isArray(savedItemRows) &&
      savedItemRows.length === itemRows.length &&
      !itemRows.some((expected) =>
        !savedItemRows.some((saved) =>
          String(saved.invoice_id) === String(invoiceId) &&
          Number(saved.item_number) === Number(expected.item_number)
        )
      );
    if (!returnedRowsConfirmed) {
      let currentInvoice: any;
      try {
        currentInvoice = await fetchPersistedMappingState(invoiceId);
      } catch (readError) {
        throw itemsError || readError;
      }
      if (!isMappingSnapshotPersisted(currentInvoice, invoiceId, effectiveSupplierId, persistedItems)) {
        throw itemsError || new Error('A gravação dos itens normalizados não foi confirmada pelo servidor.');
      }
    }
  }
  return persistedItems;
};

export const saveInboundSupplierProductCode = async (
  supplierId: string,
  productCode: string,
  productId: string,
  description: string,
  variationId?: string
) => {
  const normalizedCode = productCode.trim().toLocaleUpperCase('pt-BR');
  if (!supplierId || !normalizedCode || !productId) return;
  let resolvedProductId = productId;
  let resolvedVariationId = variationId || null;
  if (resolvedVariationId) {
    const { data: canonicalId, error: canonicalError } = await supabase.rpc(
      'resolve_canonical_variation_id',
      { p_variation_id: resolvedVariationId }
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
  const { error } = await supabase.from('product_supplier_codes').upsert(
    {
      supplier_id: supplierId,
      supplier_product_code: normalizedCode,
      product_id: resolvedProductId,
      product_variation_id: resolvedVariationId,
      supplier_description: description || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'supplier_id,supplier_product_code' }
  );
  if (error) throw error;
};

export const findInboundSupplierProductCodes = async (
  supplierId: string,
  productCodes: string[]
) => {
  const codes = [
    ...new Set(productCodes.map((code) => code.trim().toLocaleUpperCase('pt-BR')).filter(Boolean)),
  ];
  if (!supplierId || codes.length === 0) return new Map<string, any>();
  const { data, error } = await supabase
    .from('product_supplier_codes')
    .select('supplier_product_code, product_id, product_variation_id')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .in('supplier_product_code', codes);
  if (error) throw error;

  const rows = data || [];
  const storedVariationIds = [
    ...new Set(
      rows
        .map((row: any) => row.product_variation_id)
        .filter(Boolean)
        .map(String)
    ),
  ];
  const canonicalEntries = await Promise.all(
    storedVariationIds.map(async (variationId) => {
      const { data: canonicalId, error: canonicalError } = await supabase.rpc(
        'resolve_canonical_variation_id',
        { p_variation_id: variationId }
      );
      if (canonicalError) throw canonicalError;
      return [variationId, String(canonicalId || variationId)] as const;
    })
  );
  const canonicalByStoredId = new Map(canonicalEntries);
  const variationIds = [...new Set(canonicalEntries.map(([, canonicalId]) => canonicalId))];
  const productIds = [...new Set(rows.map((row: any) => String(row.product_id)))];
  const [variationsResult, productsResult] = await Promise.all([
    variationIds.length
      ? supabase
          .from('product_variations')
          .select('id, product_id, name, sku, price, use_parent_price')
          .in('id', variationIds)
      : Promise.resolve({ data: [], error: null } as any),
    productIds.length
      ? supabase.from('products').select('id, name, code, unit_price').in('id', productIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);
  if (variationsResult.error) throw variationsResult.error;
  if (productsResult.error) throw productsResult.error;

  const variationById = new Map<string, any>(
    (variationsResult.data || []).map((row: any) => [String(row.id), row])
  );
  const canonicalProductIds = [
    ...new Set(
      (variationsResult.data || [])
        .map((row: any) => String(row.product_id))
        .filter((id: string) => !productIds.includes(id))
    ),
  ];
  const { data: canonicalProducts, error: canonicalProductsError } = canonicalProductIds.length
    ? await supabase
        .from('products')
        .select('id, name, code, unit_price')
        .in('id', canonicalProductIds)
    : { data: [], error: null };
  if (canonicalProductsError) throw canonicalProductsError;
  const productById = new Map<string, any>(
    [...(productsResult.data || []), ...(canonicalProducts || [])].map((row: any) => [
      String(row.id),
      row,
    ])
  );
  return new Map(
    rows.map((row: any) => {
      let variationId = row.product_variation_id
        ? canonicalByStoredId.get(String(row.product_variation_id)) ||
          String(row.product_variation_id)
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
          sellingPrice:
            Number(
              variation?.use_parent_price
                ? product?.unit_price
                : (variation?.price ?? product?.unit_price)
            ) || 0,
        },
      ];
    })
  );
};

export const deleteInboundSupplierProductCode = async (supplierId: string, productCode: string) => {
  const normalizedCode = productCode.trim().toLocaleUpperCase('pt-BR');
  if (!supplierId || !normalizedCode) return;
  const { error } = await supabase
    .from('product_supplier_codes')
    .delete()
    .eq('supplier_id', supplierId)
    .eq('supplier_product_code', normalizedCode);
  if (error) throw error;
};
