export type {
  StockUnavailability,
  StockUnavailabilityFilters,
  UnavailabilityStatusFilter,
  UnavailabilityProductKindFilter,
  CreateStockUnavailabilityInput,
} from '../../../../services/stock/stockUnavailabilitiesService';

export const REASONS = [
  'Avaria',
  'Defeito',
  'Separação para devolução ao fornecedor',
  'Outro',
] as const;

export const TREATMENTS = [
  'Devolução ao fornecedor',
  'Descarte/perda',
  'Outro',
] as const;

export const LOCATIONS = ['Depósito', 'Mostruário', 'Outro'] as const;
