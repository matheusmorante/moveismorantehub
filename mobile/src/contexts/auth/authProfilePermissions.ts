import { Platform } from 'react-native';
import { MASTER_DEFAULT_PROFILE } from '../../services/supabaseClient';
import {
  hasProductPermission,
  normalizePermissionRoles,
  PRODUCT_PERMISSION_ACTIONS,
} from '../../../../shared-utils/productPermissions';

export const resolveWebDevOverrideProfile = (): any | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const authEmail = searchParams.get('auth_email');
    if (
      authEmail &&
      (authEmail.toLowerCase() === MASTER_DEFAULT_PROFILE.email.toLowerCase() || __DEV__)
    ) {
      return {
        ...MASTER_DEFAULT_PROFILE,
        email: authEmail,
        fullName: 'Matheus Morante',
        role: 'admin',
      };
    }
  }
  return null;
};

export const sanitizeLoadedRolePermissions = (saved: unknown): Record<string, string[]> => {
  const safePermissions: Record<string, string[]> =
    saved && typeof saved === 'object' && !Array.isArray(saved)
      ? Object.fromEntries(
          Object.entries(saved as Record<string, unknown>).map(([actionId, roles]) => [
            actionId,
            Array.isArray(roles) ? roles.filter((role) => typeof role === 'string') : [],
          ])
        )
      : {};

  // O ERP migra permissões antigas dos submódulos a partir do acesso ao cadastro.
  for (const action of PRODUCT_PERMISSION_ACTIONS) {
    if (
      action.id.startsWith('viewProduct') &&
      action.id !== 'viewProducts' &&
      !Object.prototype.hasOwnProperty.call(safePermissions, action.id)
    ) {
      safePermissions[action.id] = safePermissions.productConfig ?? [...action.defaultRoles];
    }
  }

  return safePermissions;
};

export const deriveAuthRoleFlags = (
  userProfile: any,
  rolePermissions: Record<string, string[]>,
  rolePermissionsLoaded: boolean
) => {
  const profileRoleValues = Array.isArray(userProfile?.roles)
    ? userProfile.roles.filter((role: string) => role !== 'pending')
    : [];
  const roles = normalizePermissionRoles(
    profileRoleValues.length > 0 ? profileRoleValues : [userProfile?.role]
  );
  const isAdmin = roles.includes('administrator');
  const isAssemblerDriver =
    userProfile?.role === 'assembler' ||
    userProfile?.role === 'driver' ||
    userProfile?.role === 'entregador' ||
    userProfile?.role === 'deliverer';
  const isSeller = roles.includes('seller');
  const canSeeReports = isAdmin || userProfile?.role === 'manager' || isSeller;
  const canUseProductPermission = (actionId: string) => {
    if (isAdmin) return hasProductPermission(actionId, roles, rolePermissions);
    if (!rolePermissionsLoaded) return false;
    return hasProductPermission(actionId, roles, rolePermissions);
  };
  const canSeeProducts = [
    'viewProducts',
    'viewProductCharacteristics',
    'viewProductCategories',
    'viewProductCompositions',
    'viewProductReconciliation',
  ].some(canUseProductPermission);
  const canSeeFinance =
    isAdmin || userProfile?.role === 'manager' || userProfile?.role === 'gerente';
  const canManageStock =
    isAdmin ||
    userProfile?.permissions?.manualStockMovement === true ||
    userProfile?.permissions?.includes?.('manualStockMovement');

  return {
    isAdmin,
    isAssemblerDriver,
    isSeller,
    canSeeReports,
    canSeeProducts,
    canUseProductPermission,
    canSeeFinance,
    canManageStock,
  };
};
