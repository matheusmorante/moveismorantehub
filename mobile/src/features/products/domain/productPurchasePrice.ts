import {
  calculateProductFinalPurchasePrice,
  type ProductFreightType,
  type ProductIpiType,
} from '../../../../../shared-utils/productPurchasePricing';
import { parseLocalizedNumber } from './productNumbers';

type ProductPurchasePricingSource = {
  costPrice?: number | string | null;
  cost_price?: number | string | null;
  ipiPercent?: number | string | null;
  ipi_percent?: number | string | null;
  ipiType?: ProductIpiType | null;
  ipi_type?: ProductIpiType | null;
  freightCost?: number | string | null;
  freight_cost?: number | string | null;
  freightType?: ProductFreightType | null;
  freight_type?: ProductFreightType | null;
};

/** Deriva o custo final no mesmo padrão do ERP ao hidratar um produto. */
export const resolveMobileProductFinalPurchasePrice = (
  product: ProductPurchasePricingSource
): number =>
  calculateProductFinalPurchasePrice(
    parseLocalizedNumber(product.costPrice ?? product.cost_price),
    parseLocalizedNumber(product.ipiPercent ?? product.ipi_percent),
    parseLocalizedNumber(product.freightCost ?? product.freight_cost),
    product.freightType ?? product.freight_type ?? 'fixed',
    product.ipiType ?? product.ipi_type ?? 'percentage'
  );
