export type {
  StockUnavailability,
  StockUnavailabilityFilters,
  UnavailabilityStatusFilter,
  UnavailabilityProductKindFilter,
  CreateStockUnavailabilityInput,
} from '../../../services/stock/stockUnavailabilitiesService';

export const REASONS = [
  'Avaria',
  'Defeito',
  'Separação para devolução ao fornecedor',
  'Outro',
] as const;

export const TREATMENTS = ['Devolução ao fornecedor', 'Descarte/perda', 'Outro'] as const;

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
