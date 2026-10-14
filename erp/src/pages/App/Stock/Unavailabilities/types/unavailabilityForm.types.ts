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

export { UNAVAILABILITY_REASONS, UNAVAILABILITY_TREATMENTS } from '../../../../../../../shared-utils/operationsFormSchemas';
import { UNAVAILABILITY_REASONS, UNAVAILABILITY_TREATMENTS } from '../../../../../../../shared-utils/operationsFormSchemas';

export type UnavailabilityReason = (typeof UNAVAILABILITY_REASONS)[number];



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
