import { getSettings } from '@/pages/utils/settingsService';
import { validateNfeEmission as validateDomain, type ValidationParams } from '../../../../../../../../shared-utils/nfeEmissionFormValidation';
export type { ValidationParams, ValidationResult } from '../../../../../../../../shared-utils/nfeEmissionFormValidation';
export function validateNfeEmission(params: ValidationParams) {
  return validateDomain({ ...params, issuerUf: getSettings().companyUF });
}
