import { saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import type { InboundReceiptItem } from '../components/InboundNfeItemsSection';

export async function persistInboundSupplierProductCodes(
  inboundItems: InboundReceiptItem[] | null,
  supplierId: string
): Promise<void> {
  if (!inboundItems || !inboundItems.length) return;

  await Promise.all(
    inboundItems.flatMap((item) => {
      if (item.linkMode === 'composition' && item.compositionLinks?.length) {
        return item.compositionLinks.map((comp) =>
          saveProductSupplierCode({
            supplierId,
            productId: comp.productId,
            productVariationId: comp.variationId,
            supplierProductCode: item.productCode,
            supplierDescription: item.productDescription,
          })
        );
      }
      if (item.linkedProductId) {
        return [
          saveProductSupplierCode({
            supplierId,
            productId: item.linkedProductId,
            productVariationId: item.linkedVariationId,
            supplierProductCode: item.productCode,
            supplierDescription: item.productDescription,
          }),
        ];
      }
      return [];
    })
  );
}
