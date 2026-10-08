import type { UserRole } from '../../context/AuthContext';
import { getSettings } from '@/pages/utils/settingsService';
import { findPermissionAction, isFinanceAdminOnlyAction } from './permissionConfig';

export type PermissionAction =
  | 'viewOrders'
  | 'createEditOrders'
  | 'deleteOrders'
  | 'startDelivery'
  | 'viewProducts'
  | 'viewStock'
  | 'viewSuppliers'
  | 'productConfig'
  | 'manualStockMovement'
  | 'deleteProducts'
  | 'viewFinancials'
  | 'exportReports'
  | 'viewFiscal'
  | 'viewMarketing'
  | 'viewPeople'
  | 'createEditPeople'
  | 'deletePeople'
  | 'manageAccess'
  | 'manageSettings'
  | string;

/**
 * Checks if a user role has permission to perform a specific action.
 * Permissions are defined in AppSettings (rolePermissions).
 */
export const canPerform = (action: PermissionAction, role?: UserRole | UserRole[]): boolean => {
  if (!role) return false;

  // Normaliza para array
  const roles = Array.isArray(role) ? role : [role];
  if (roles.length === 0 || (roles.length === 1 && roles[0] === 'pending')) return false;

  if (isFinanceAdminOnlyAction(action)) return roles.includes('administrator');

  // Administrators always have full access
  if (roles.includes('administrator')) return true;
  if (action === 'manageSettings') return false;

  const settings = getSettings();
  const permissions = settings.rolePermissions;

  if (permissions && permissions[action] !== undefined) {
    const rolesWithPermission = permissions[action] || [];
    return rolesWithPermission.some((r) => roles.includes(r as UserRole));
  }

  // Default fallback for actions not initialized in older settings records.
  return findPermissionAction(action)?.defaultRoles.some((allowedRole) => roles.includes(allowedRole)) ?? false;
};
