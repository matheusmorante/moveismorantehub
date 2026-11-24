import { parseInboundNfeXml } from '@/pages/utils/inboundNfe/inboundXmlParser';
import type { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

const needsXmlRepair = (item: InboundInvoiceItem): boolean =>
  !item.productDescription ||
  item.productDescription === 'Item sem descrição' ||
  (item.unitCost === 0 && item.totalCost === 0);

/**
 * Restaura descrição e custos de itens da NF-e a partir do XML bruto preservando vínculos já salvos.
 */
export const repairInboundItemsFromXml = (initialInvoice: InboundInvoice): InboundInvoice => {
  if (
    !initialInvoice.rawXml ||
    !initialInvoice.items ||
    !initialInvoice.items.some(needsXmlRepair)
  ) {
    return initialInvoice;
  }

  try {
    const parsed = parseInboundNfeXml(initialInvoice.rawXml);
    if (!parsed.items || parsed.items.length === 0) {
      return initialInvoice;
    }

    const repairedItems = parsed.items.map((xmlItem, idx) => {
      const existing =
        initialInvoice.items.find(
          (candidate) =>
            candidate.itemNumber === xmlItem.itemNumber ||
            (candidate.productCode && candidate.productCode === xmlItem.productCode)
        ) || initialInvoice.items[idx];

      return {
        ...xmlItem,
        linkMode: existing?.linkMode || xmlItem.linkMode,
        compositionLinks: existing?.compositionLinks || xmlItem.compositionLinks,
        matchedProductId: existing?.matchedProductId || xmlItem.matchedProductId,
        matchedVariationId: existing?.matchedVariationId || xmlItem.matchedVariationId,
        productErpName: existing?.productErpName || xmlItem.productErpName,
        linkedProductCode: existing?.linkedProductCode || xmlItem.linkedProductCode,
      };
    });

    return { ...initialInvoice, items: repairedItems };
  } catch (error) {
    console.warn('Erro ao restaurar itens do XML:', error);
    return initialInvoice;
  }
};
