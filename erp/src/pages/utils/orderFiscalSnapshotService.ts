import type Item from '../types/items.type';
import { parseAuthorizedInvoiceLines } from './nfe/invoiceLineSnapshot';
import { getProductsFiscalData } from './productService/productFiscalDataService';
import {
  createFiscalItemSnapshot,
  hasFiscalItemSnapshot,
  hasPersistedAuthorizedInvoice,
} from '../../../../shared-utils/orderItemFiscalSnapshot';

const xmlChildText = (xml: string, name: string) =>
  xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i'))?.[1]
    ?.replace(/<[^>]+>/g, '')
    .trim() || '';

function authorizedInvoiceFiscalByItem(
  items: Item[],
  nfeData?: { xml?: string; status?: string }
) {
  const result = new Map<Item, Record<string, string>>();
  if (!nfeData?.xml || !hasPersistedAuthorizedInvoice({ nfeData })) return result;
  try {
    const productItems = items.filter((item) => item.itemType !== 'service');
    const lines = parseAuthorizedInvoiceLines(nfeData.xml);
    productItems.forEach((item, index) => {
      const line = lines.find((candidate) => candidate.invoiceItemNumber === index + 1);
      if (!line) return;
      const sameCode = Boolean(item.code && line.productCode && item.code === line.productCode);
      const sameDescription =
        item.description.trim().toLocaleLowerCase() === line.description.trim().toLocaleLowerCase();
      if (!sameCode && !sameDescription) return;
      const fiscal: Record<string, string> = {};
      const assign = (field: string, value: string) => {
        if (value) fiscal[field] = value;
      };
      assign('ncm', xmlChildText(line.productXml, 'NCM'));
      assign('cest', xmlChildText(line.productXml, 'CEST'));
      assign('cfop', xmlChildText(line.productXml, 'CFOP'));
      assign('origem', xmlChildText(line.taxesXml, 'orig'));
      assign('cst', xmlChildText(line.taxesXml, 'CSOSN') || xmlChildText(line.taxesXml, 'CST'));
      assign('commercialUnit', xmlChildText(line.productXml, 'uCom'));
      assign('taxableUnit', xmlChildText(line.productXml, 'uTrib'));
      if (Object.keys(fiscal).length) result.set(item, fiscal);
    });
  } catch {
    // A malformed prior invoice must not be replaced with current catalog data.
  }
  return result;
}

/**
 * Backfills only legacy order lines. Existing snapshots stay unchanged, while
 * missing catalog facts are read in one batch before the order transaction.
 */
export async function ensureOrderItemsHaveFiscalSnapshots(
  items: Item[],
  nfeData?: { xml?: string; status?: string }
): Promise<Item[]> {
  const authorizedFiscal = authorizedInvoiceFiscalByItem(items, nfeData);
  const hasAuthorizedInvoice = hasPersistedAuthorizedInvoice({ nfeData });
  const catalogIds = Array.from(
    new Set(
      items
        .filter(
          (item) =>
            !hasAuthorizedInvoice && item.itemType !== 'service' && !hasFiscalItemSnapshot(item)
        )
        .map((item) => item.productId || item.fiscalSnapshotProductId)
        .filter((id): id is string => typeof id === 'string' && Boolean(id))
    )
  );

  const catalog = catalogIds.length
    ? await getProductsFiscalData(catalogIds, { useCache: false })
    : new Map();

  return items.map((item) => {
    if (item.itemType === 'service') return item;
    if (hasFiscalItemSnapshot(item)) return item;

    const invoiceFiscal = authorizedFiscal.get(item);
    if (invoiceFiscal) {
      const invoiceSnapshotFiscal = { ...item.fiscal, ...invoiceFiscal };
      return createFiscalItemSnapshot(
        item,
        {
          id: item.productId || item.fiscalSnapshotProductId,
          fiscal: invoiceSnapshotFiscal,
        },
        undefined,
        { preserveExisting: false }
      ) as Item;
    }
    if (hasAuthorizedInvoice) return item;

    const productId = item.productId || item.fiscalSnapshotProductId;
    if (!productId) {
      return createFiscalItemSnapshot(
        item,
        { unit: item.fiscal?.commercialUnit, fiscal: item.fiscal },
        undefined,
        { preserveExisting: true }
      ) as Item;
    }
    const product = productId ? catalog.get(productId) : undefined;
    if (!product) {
      if (item.isTemporaryProduct) {
        return createFiscalItemSnapshot(
          item,
          { id: productId, unit: item.fiscal?.commercialUnit, fiscal: item.fiscal },
          undefined,
          { preserveExisting: true }
        ) as Item;
      }
      return item;
    }
    const variationId = item.variationId || item.fiscalSnapshotVariationId;
    const variation = variationId ? product.variations?.[variationId] : undefined;

    return createFiscalItemSnapshot(
      item,
      { id: product.id, unit: product.unit, fiscal: product },
      variation ? { id: variationId, fiscal: variation } : undefined,
      { preserveExisting: true }
    ) as Item;
  });
}
