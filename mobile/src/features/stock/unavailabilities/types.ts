import {
  UNAVAILABILITY_REASONS,
  UNAVAILABILITY_TREATMENTS,
  type UnavailabilityReason,
  type UnavailabilityTreatment,
} from '../../../../../shared-utils/operationsFormSchemas';

export type {
  CreateStockUnavailabilityInput,
  StockUnavailability,
  StockUnavailabilityFilters,
  UnavailabilityProductKindFilter,
  UnavailabilityStatusFilter,
} from '../../../services/stock/stockUnavailabilitiesService';

export {
  UNAVAILABILITY_REASONS,
  UNAVAILABILITY_TREATMENTS,
  type UnavailabilityReason,
  type UnavailabilityTreatment,
};

export const REASONS = UNAVAILABILITY_REASONS;
export const TREATMENTS = UNAVAILABILITY_TREATMENTS;

export const LOCATIONS = ['Depósito', 'Mostruário', 'Outro'] as const;

export interface ProductVariationSuggestion {
  id: string;
  name: string;
  sku: string;
  stock: number;
  variation_id: string;
  variationName: string;
}

export interface SupplierOption {
  id: string;
  fantasy_name: string;
}
