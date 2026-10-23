import type { ProductFreightType } from './productPurchasePricing';

export type { ProductFreightType } from './productPurchasePricing';

type ProductSupplierPricingValues = {
  ipiPercent?: number | string | null;
  freightCost?: number | string | null;
  freightType?: ProductFreightType | null;
};

export interface ProductSupplierPricingDefaults {
  defaultIpiPercent?: number | null;
  defaultFreightCost?: number | null;
  defaultFreightType?: ProductFreightType | null;
}

export function resolveProductSupplierPricingDefaults<T extends ProductSupplierPricingValues>(
  current: T,
  defaults: ProductSupplierPricingDefaults
): {
  ipiPercent: T['ipiPercent'] | number | undefined;
  freightCost: T['freightCost'] | number | undefined;
  freightType: T['freightType'] | ProductFreightType | undefined;
} {
  return {
    ipiPercent: defaults.defaultIpiPercent ?? current.ipiPercent,
    freightCost: defaults.defaultFreightCost ?? current.freightCost,
    freightType: defaults.defaultFreightType || current.freightType,
  };
}
