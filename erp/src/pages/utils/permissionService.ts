import { UserRole } from "../../context/AuthContext";
import { getSettings } from '@/pages/utils/settingsService';

export type PermissionAction = 
    | 'manualStockMovement' 
    | 'productConfig' 
    | 'viewFinancials' 
    | 'deleteOrders' 
    | 'manageSettings';

/**
 * Checks if a user role has permission to perform a specific action.
 * Permissions are defined in the AppSettings.
 */
export const canPerform = (action: PermissionAction, role?: UserRole): boolean => {
    if (!role) return false;
    
    // Safety check for pending users
    if (role === 'pending') return false;

    // Administrators always have full access
    if (role === 'administrator') return true;

    const settings = getSettings();
    const permissions = settings.rolePermissions;

    if (!permissions) {
        // Fallback default permissions if settings aren't loaded or defined
        const defaults: Record<PermissionAction, UserRole[]> = {
            manualStockMovement: ['manager'],
            productConfig: ['manager'],
            viewFinancials: ['manager', 'accountant'],
            deleteOrders: ['manager'],
            manageSettings: [] // Admin only via hardcode above
        };
        return defaults[action].includes(role);
    }

    const rolesWithPermission = permissions[action] || [];
    return rolesWithPermission.includes(role);
};
