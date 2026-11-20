import { withTimeout } from './withTimeout';

type ReusedItem = {
  itemNumber: number;
  supplierProductCode: string;
  matchedProductId: string;
  matchedVariationId: string | null;
  productErpName: string;
  linkedProductCode: string;
  sellingPrice: number;
};

type ReusedLinks = {
  supplierId: string;
  items: ReusedItem[];
};

type LinkReuseClient = {
  rpc(
    name: 'reuse_pending_inbound_invoice_links',
    args: { p_invoice_id: string; p_include_related: boolean }
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

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
  const result = await withTimeout(
    client.rpc('reuse_pending_inbound_invoice_links', {
      p_invoice_id: invoiceId,
      p_include_related: includeRelated,
    }),
    10_000,
    null,
    'entrada:reaproveitar-vinculos'
  );
  if (!result) throw new Error('A consulta de vínculos anteriores da NF-e excedeu o prazo.');
  if (result.error) throw new Error(result.error.message);
  return result.data as ReusedLinks | null;
}

export function applyReusedInboundInvoiceLinks<T extends {
  itemNumber: number;
  productCode: string;
  linkMode?: string;
  matchedProductId?: string | null;
  matchedVariationId?: string | null;
}>(items: T[], reuse: ReusedLinks | null): T[] {
  if (!reuse?.items.length) return items;
  const links = new Map(reuse.items.map((link) => [link.itemNumber, link]));
  return items.map((item) => {
    const link = links.get(item.itemNumber);
    if (!link || item.linkMode || item.matchedProductId || item.matchedVariationId ||
      link.supplierProductCode !== item.productCode.trim().toLocaleUpperCase('pt-BR')) return item;
    return {
      ...item,
      matchedProductId: link.matchedProductId,
      matchedVariationId: link.matchedVariationId ?? undefined,
      productErpName: link.productErpName,
      linkedProductCode: link.linkedProductCode,
      sellingPrice: link.sellingPrice,
      linkMode: 'single',
      inheritedSupplierLink: true,
    };
  });
}
