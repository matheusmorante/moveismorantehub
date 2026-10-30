import { supabase } from '../../supabaseClient';
import { parseInboundNfeXml } from '../../../features/stock/invoices/utils/inboundXmlParser';
import { buildInboundInvoiceItemRows } from './inboundInvoiceMappers';
import {
  getSupplierStockOriginsFromRelation,
  isSalvadosOnlySupplier,
} from '../../../../../shared-utils/productSupplierStockOrigin';
import { markInboundInvoiceItemsNotApplicable } from '../../../../../shared-utils/inboundInvoiceSupplierRules';

export const fetchInboundInvoiceForMappings = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from('inbound_invoices')
    .select(
      'id, numero_nfe, serie, emitente_nome, emitente_cnpj, supplier_id, itens, xml_conteudo, supplier:people(stock_origins), inbound_invoice_items(item_number, product_code, product_description, product_id, variation_id, raw_item)'
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

export const updateInboundInvoiceMappings = async (
  invoiceId: string,
  supplierId: string | null,
  items: any[]
) => {
  const { data: currentInvoice, error: currentInvoiceError } = await supabase
    .from('inbound_invoices')
    .select('supplier_id, supplier:people(stock_origins)')
    .eq('id', invoiceId)
    .maybeSingle();
  if (currentInvoiceError) throw currentInvoiceError;

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
  const persistedItems = isSalvadosSupplier
    ? markInboundInvoiceItemsNotApplicable(items)
    : items;

  const { error } = await supabase
    .from('inbound_invoices')
    .update({ supplier_id: effectiveSupplierId, itens: persistedItems, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);
  if (error) throw error;

  if (persistedItems.length) {
    const itemRows = buildInboundInvoiceItemRows(invoiceId, persistedItems);
    const { error: itemsError } = await supabase
      .from('inbound_invoice_items')
      .upsert(itemRows, { onConflict: 'invoice_id,item_number' });
    if (itemsError) throw itemsError;
  }
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
