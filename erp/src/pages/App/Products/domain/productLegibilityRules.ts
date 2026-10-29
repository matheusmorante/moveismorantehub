import Product from '@/pages/types/product.type';
import {
  checkProductErpLegibility,
  type ProductErpLegibilityResult,
} from '../../../../../../shared-utils/productErpLegibility';

export type ERPLegibilityResult = ProductErpLegibilityResult;

export {
  checkEcomLegibility,
  type EcomLegibilityResult,
  isPositiveNumber,
  buildPublishedCatalogEditConfirmationMessage,
  getPublishedCatalogEditIssues,
  type PublishedCatalogEditIssue,
} from '../../../../../../shared-utils/catalogPublicationValidation';

export function checkERPLegibility(data: Readonly<Partial<Product>>): ERPLegibilityResult {
  return checkProductErpLegibility(data);
}
