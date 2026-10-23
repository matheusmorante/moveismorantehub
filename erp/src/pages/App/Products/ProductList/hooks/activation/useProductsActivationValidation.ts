import type Product from '@/pages/types/product.type';
import { validateProductActivationRequirements } from '../../../../../../../../shared-utils/productActivationValidation';
import type { ProductActivationValidationResult } from '../../../../../../../../shared-utils/productActivationValidation';

export type ErpActivationValidationResult = ProductActivationValidationResult;

/**
 * Valida os requisitos mínimos do ERP para ativar um produto ou variação.
 */
export const validateErpActivationRequirements = (
  id: string,
  products: readonly Product[],
  serverProducts: readonly Product[]
): ErpActivationValidationResult =>
  validateProductActivationRequirements(id, products, serverProducts);
