import type { Item as OrderItem } from '@/pages/types/items.type';
import type { NfeItemFiscal } from '../../NfeItemsSection';

export const invertIfReversalCfop = (cfop?: string, destination?: string | null): string | undefined => {
  if (!cfop) return cfop;
  if (['1949', '2949', '1202', '2202'].includes(cfop)) {
    return destination === '2' ? '6102' : '5102';
  }
  return cfop;
};

export interface DraftItemLike {
  orderItemId?: string;
  productId?: string;
  variationId?: string;
  code?: string;
  fiscal?: Partial<NfeItemFiscal>;
}

export function resolveEmissionDraftByIndex(
  productItems: OrderItem[],
  savedEmissionItems: DraftItemLike[]
): Map<number, Partial<NfeItemFiscal>> {
  const emissionDraftByIndex = new Map<number, Partial<NfeItemFiscal>>();
  const usedDraftIndices = new Set<number>();

  productItems.forEach((item, itemIndex) => {
    let draftIndex = item.orderItemId
      ? savedEmissionItems.findIndex(
          (draft, index) => !usedDraftIndices.has(index) && draft.orderItemId === item.orderItemId
        )
      : -1;

    if (draftIndex < 0 && (item.productId || item.variationId)) {
      draftIndex = savedEmissionItems.findIndex(
        (draft, index) =>
          !usedDraftIndices.has(index) &&
          draft.productId === (item.fiscalSnapshotProductId || item.productId) &&
          (draft.variationId || undefined) ===
            (item.fiscalSnapshotVariationId || item.variationId || undefined)
      );
    }

    if (draftIndex < 0 && item.code?.trim()) {
      draftIndex = savedEmissionItems.findIndex(
        (draft, index) =>
          !usedDraftIndices.has(index) &&
          (draft as any).code?.trim() === item.code?.trim()
      );
    }

    if (draftIndex < 0 && savedEmissionItems[itemIndex] && !usedDraftIndices.has(itemIndex)) {
      draftIndex = itemIndex;
    }

    if (draftIndex < 0 && savedEmissionItems.length > 0 && productItems.length === 1) {
      const singleCand = savedEmissionItems.findIndex(
        (draft, index) => !usedDraftIndices.has(index) && draft.fiscal?.ncm
      );
      if (singleCand >= 0) draftIndex = singleCand;
    }

    if (draftIndex < 0) return;

    usedDraftIndices.add(draftIndex);
    if (savedEmissionItems[draftIndex]?.fiscal) {
      emissionDraftByIndex.set(itemIndex, savedEmissionItems[draftIndex].fiscal!);
    }
  });

  return emissionDraftByIndex;
}
