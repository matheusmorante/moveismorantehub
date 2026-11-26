import { withTimeout } from '../core/withTimeout';
import {
  getInboundInvoiceSupplierCodes,
  normalizeInboundSupplierProductCode,
  type GlobalInboundSupplierItemMapping,
} from './inboundInvoiceMappingState';

type ReusedItem = {
  supplierProductCode: string;
  linkMode: GlobalInboundSupplierItemMapping['link_mode'];
  matchedProductId?: string | null;
  matchedVariationId?: string | null;
  productErpName?: string | null;
  linkedProductCode?: string | null;
  sellingPrice?: number | null;
  compositionLinks?: Array<Record<string, any>>;
};

type ReusedLinks = {
  supplierId: string;
  items: ReusedItem[];
};

type LinkReuseClient = any;

type HistorySupplier = { id: string; stock_origins: string[] | null };

type SupplierHistoryClient = {
  rpc(
    name: 'find_inbound_invoice_history_supplier',
    args: { p_emitter: string; p_environment: number | null; p_access_key: string | null }
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function findInboundInvoiceHistorySupplier(
  client: SupplierHistoryClient,
  emitter: string,
  environment?: number,
  accessKey?: string,
): Promise<HistorySupplier | undefined> {
  const result = await withTimeout(
    client.rpc('find_inbound_invoice_history_supplier', {
      p_emitter: emitter,
      p_environment: environment ?? null,
      p_access_key: accessKey || null,
    }),
    10_000,
    null,
    'entrada:consultar-historico-do-fornecedor'
  );
  if (!result) throw new Error('A consulta do fornecedor anterior da NF-e excedeu o prazo.');
  if (result.error) throw new Error(result.error.message);
  return (result.data as HistorySupplier[] | null)?.[0];
}

export async function reusePendingInboundInvoiceLinks(
  client: LinkReuseClient,
  invoiceId: string,
  includeRelated = false
): Promise<ReusedLinks | null> {
  void includeRelated;
  const result = await withTimeout(
    client
      .from('inbound_invoices')
      .select('supplier_id, itens, inbound_invoice_items(item_number, product_code, raw_item)')
      .eq('id', invoiceId)
      .maybeSingle(),
    10_000,
    null,
    'entrada:consultar-vinculos-globais'
  );
  if (!result) throw new Error('A consulta de vínculos globais da NF-e excedeu o prazo.');
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;

  const invoice = result.data;
  const supplierId = String(invoice.supplier_id || '');
  if (!supplierId) return { supplierId: '', items: [] };
  const keys = getInboundInvoiceSupplierCodes(invoice);
  if (!keys.length) return { supplierId, items: [] };

  const mappingResult = await withTimeout(
    client.rpc('find_inbound_supplier_item_mappings', {
      p_keys: keys,
    }),
    10_000,
    null,
    'entrada:consultar-vinculos-globais'
  );
  if (!mappingResult) throw new Error('A consulta de vínculos globais da NF-e excedeu o prazo.');
  if (mappingResult.error) throw new Error(mappingResult.error.message);

  const mappings = (mappingResult.data || []) as GlobalInboundSupplierItemMapping[];
  const items: ReusedItem[] = mappings.map((mapping) => {
    const code = normalizeInboundSupplierProductCode(mapping.supplier_product_code);
    return {
      supplierProductCode: code,
      linkMode: mapping.link_mode,
      matchedProductId: mapping.link_mode === 'single' ? mapping.product_id || null : null,
      matchedVariationId: mapping.link_mode === 'single' ? mapping.variation_id || null : null,
      productErpName: mapping.link_mode === 'single' ? mapping.product_name || null : null,
      linkedProductCode: mapping.link_mode === 'single' ? mapping.product_sku || null : null,
      sellingPrice: mapping.link_mode === 'single' ? Number(mapping.selling_price || 0) : null,
      compositionLinks: mapping.link_mode === 'composition'
        ? (mapping.components || []).map((component, position) => ({
            id: String(component.id ?? `${code}:${position + 1}`),
            productId: component.productId ?? component.product_id,
            variationId: component.variationId ?? component.variation_id ?? undefined,
            productErpName: component.productErpName ?? component.product_erp_name ?? '',
            linkedProductCode: component.linkedProductCode ?? component.linked_product_code ?? '',
            sellingPrice: Number(component.sellingPrice ?? component.selling_price ?? 0),
            quantityMultiplier: Number(component.quantityMultiplier ?? component.quantity_multiplier ?? 1),
            apportionedCost: undefined,
          }))
        : [],
    };
  });
  return { supplierId, items };
}

export function applyReusedInboundInvoiceLinks<T extends {
  productCode: string;
  linkMode?: string;
  matchedProductId?: string | null;
  matchedVariationId?: string | null;
}>(items: T[], reuse: ReusedLinks | null): T[] {
  if (!reuse) return items;
  const links = new Map(reuse.items.map((link) => [
    normalizeInboundSupplierProductCode(link.supplierProductCode),
    link,
  ]));
  return items.map((item) => {
    const link = links.get(normalizeInboundSupplierProductCode(item.productCode));
    const cleared = {
      ...item,
      matchedProductId: undefined,
      matched_product_id: undefined,
      matchedVariationId: undefined,
      matched_variation_id: undefined,
      productErpName: undefined,
      product_erp_name: undefined,
      linkedProductCode: undefined,
      linked_product_code: undefined,
      sellingPrice: undefined,
      linkMode: undefined,
      link_mode: undefined,
      inheritedSupplierLink: undefined,
      compositionLinks: [],
      composition_links: [],
    };
    if (!link) return cleared;
    return {
      ...cleared,
      matchedProductId: link.matchedProductId || undefined,
      matched_product_id: link.matchedProductId || undefined,
      matchedVariationId: link.matchedVariationId || undefined,
      matched_variation_id: link.matchedVariationId || undefined,
      productErpName: link.productErpName || undefined,
      product_erp_name: link.productErpName || undefined,
      linkedProductCode: link.linkedProductCode || undefined,
      linked_product_code: link.linkedProductCode || undefined,
      sellingPrice: link.sellingPrice ?? undefined,
      linkMode: link.linkMode,
      link_mode: link.linkMode,
      inheritedSupplierLink: true,
      compositionLinks: link.linkMode === 'composition' ? link.compositionLinks || [] : [],
      composition_links: link.linkMode === 'composition' ? link.compositionLinks || [] : [],
    };
  });
}
