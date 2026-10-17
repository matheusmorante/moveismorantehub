import { useAuth } from '../../../contexts/AuthContext';
import {
  getProductProfileRoles,
  isStockistOnlyProductProfile,
  normalizePermissionRoles,
  shouldHideProductCatalogPublicationStatus,
} from '../../../../../shared-utils/productPermissions';

export interface ProductFormPermissions {
  isStockistOnly: boolean;
  canConfigureProductTaxes: boolean;
  canManageCategories: boolean;
  hideCatalogPublicationStatus: boolean;
}

/**
 * Custom hook encapsulating role and permission calculations for the mobile product form.
 * Ensures single responsibility and clean separation of auth/role queries from screen layout.
 */
export function useProductFormPermissions(): ProductFormPermissions {
  const { userProfile, canUseProductPermission } = useAuth();
  const isStockistOnly = isStockistOnlyProductProfile(userProfile);
  const productProfileRoles = normalizePermissionRoles(getProductProfileRoles(userProfile));
  const canConfigureProductTaxes = productProfileRoles.some(
    (role) => role !== 'seller' && role !== 'stockist'
  );
  const canManageCategories = canUseProductPermission('viewProductCategories');
  const hideCatalogPublicationStatus = shouldHideProductCatalogPublicationStatus(userProfile);

  return {
    isStockistOnly,
    canConfigureProductTaxes,
    canManageCategories,
    hideCatalogPublicationStatus,
  };
}
