import type { PurchaseItem } from '@/pages/types/purchase.type';
import type {
  InboundInvoice,
  InboundInvoiceItem,
} from '@/pages/utils/inboundNfe/inboundNfeTypes';

type ReceiptRateioBaseInput = {
  initialInvoice: Pick<InboundInvoice, 'totalInvoice' | 'totalProducts'> | null | undefined;
  inboundItems: readonly Pick<InboundInvoiceItem, 'unitCost' | 'quantity'>[] | null;
  items: readonly Pick<PurchaseItem, 'fiscalBaseCost' | 'baseCost' | 'unitCost' | 'quantity'>[];
};

export function calculateReceiptRateioBase({
  initialInvoice,
  inboundItems,
  items,
}: ReceiptRateioBaseInput): number {
  if (initialInvoice?.totalInvoice && initialInvoice.totalInvoice > 0) {
    return initialInvoice.totalInvoice;
  }

  if (initialInvoice?.totalProducts && initialInvoice.totalProducts > 0) {
    return initialInvoice.totalProducts;
  }

  if (inboundItems && inboundItems.length > 0) {
    const total = inboundItems.reduce(
      (sum, item) => sum + (item.unitCost || 0) * Math.max(1, item.quantity),
      0
    );
    if (total > 0) return total;
  }

  if (items.length > 0) {
    const total = items.reduce(
      (sum, item) =>
        sum +
        (item.fiscalBaseCost ?? item.baseCost ?? item.unitCost ?? 0) * Math.max(1, item.quantity),
      0
    );
    if (total > 0) return total;
  }

  return 0;
}
