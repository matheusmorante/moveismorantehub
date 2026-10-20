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
    const usedLineIndices = new Set<number>();
    productItems.forEach((item, index) => {
      let lineIndex = item.code?.trim()
        ? lines.findIndex(
            (cand, idx) => !usedLineIndices.has(idx) && cand.productCode?.trim() === item.code?.trim()
          )
        : -1;
      if (lineIndex < 0 && item.description?.trim()) {
        const itemDesc = item.description.trim().toLocaleLowerCase();
        lineIndex = lines.findIndex(
          (cand, idx) =>
            !usedLineIndices.has(idx) &&
            cand.description.trim().toLocaleLowerCase() === itemDesc
        );
      }
      if (lineIndex < 0) {
        const posIdx = lines.findIndex(
          (cand, idx) =>
            !usedLineIndices.has(idx) &&
            cand.invoiceItemNumber === index + 1 &&
            (!item.code?.trim() || !cand.productCode?.trim() || item.code.trim() === cand.productCode.trim())
        );
        if (posIdx >= 0) lineIndex = posIdx;
      }
      if (lineIndex < 0) return;
      usedLineIndices.add(lineIndex);
      const line = lines[lineIndex];

      const fiscal: Record<string, string> = {};
      const assign = (field: string, value: string) => {
        if (value) fiscal[field] = value;
      };
      assign('ncm', xmlChildText(line.productXml, 'NCM'));
      assign('cest', xmlChildText(line.productXml, 'CEST'));
      const rawCfop = xmlChildText(line.productXml, 'CFOP');
      if (['1949', '2949', '1202', '2202'].includes(rawCfop)) {
        assign('cfop', rawCfop.startsWith('2') ? '6102' : '5102');
      } else if (rawCfop) {
        assign('cfop', rawCfop);
      }
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
 * Backfills legacy order lines and missing NCM before authorization. Recorded
 * values stay unchanged; authorized invoices use only their original XML.
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
            !hasAuthorizedInvoice && item.itemType !== 'service' &&
            (!hasFiscalItemSnapshot(item) || !item.fiscal?.ncm?.trim())
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
    const invoiceFiscal = authorizedFiscal.get(item);
    if (hasFiscalItemSnapshot(item)) {
      if ((!item.fiscal?.ncm || !item.fiscal.ncm.trim()) && invoiceFiscal?.ncm) {
        return {
          ...item,
          fiscal: {
            ...item.fiscal,
            ncm: invoiceFiscal.ncm,
            ...(invoiceFiscal.cest && !item.fiscal?.cest ? { cest: invoiceFiscal.cest } : {}),
            ...(invoiceFiscal.origem && !item.fiscal?.origem ? { origem: invoiceFiscal.origem } : {}),
            ...(invoiceFiscal.cst && !item.fiscal?.cst ? { cst: invoiceFiscal.cst } : {}),
            ...(invoiceFiscal.cfop && (!item.fiscal?.cfop || ['1949', '2949'].includes(item.fiscal.cfop))
              ? { cfop: invoiceFiscal.cfop }
              : {}),
          },
        };
      }
      if (!hasAuthorizedInvoice && !item.fiscal?.ncm?.trim()) {
        const product = catalog.get(item.productId || item.fiscalSnapshotProductId);
        const variationId = item.variationId || item.fiscalSnapshotVariationId;
        const variation = variationId ? product?.variations?.[variationId] : undefined;
        const ncm = variation?.ncm?.trim() || product?.ncm?.trim();
        if (ncm) return { ...item, fiscal: { ...item.fiscal, ncm } };
      }
      return item;
    }

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
