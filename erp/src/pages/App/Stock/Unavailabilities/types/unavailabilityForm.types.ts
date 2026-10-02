import type { Product, Variation } from '@/pages/types/product.type';

export interface UnavailabilitySupplier {
  id: string;
  fantasy_name: string;
}

export interface UnavailabilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UNAVAILABILITY_REASONS = [
  'Avaria',
  'Defeito',
  'Separação para devolução ao fornecedor',
  'Outro',
] as const;

export type UnavailabilityReason = (typeof UNAVAILABILITY_REASONS)[number];

export const UNAVAILABILITY_TREATMENTS = [
  'Devolução ao fornecedor',
  'Descarte/perda',
  'Outro',
] as const;

export type UnavailabilityTreatment = (typeof UNAVAILABILITY_TREATMENTS)[number];

export const DEFAULT_PHYSICAL_LOCATION = 'Depósito';

export interface UnavailabilityFormState {
  isLoading: boolean;
  selectedProduct: Product | null;
  selectedVariation: Variation | undefined;
  quantity: string;
  reason: string;
  treatment: string;
  physicalLocation: string;
  observation: string;
  suppliers: UnavailabilitySupplier[];
  supplierId: string;
  photos: File[];
  isFieldsDisabled: boolean;
}
