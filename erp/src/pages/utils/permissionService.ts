import { UserRole } from "../../context/AuthContext";
import { getSettings } from '@/pages/utils/settingsService';
import { PERMISSION_AREAS } from './permissionConfig';

export type PermissionAction = 
    | 'viewOrders'
    | 'createEditOrders'
    | 'deleteOrders' 
    | 'startDelivery'
    | 'viewProducts'
    | 'productConfig' 
    | 'manualStockMovement' 
    | 'deleteProducts'
    | 'viewFinancials' 
    | 'exportReports'
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
export const canPerform = (action: PermissionAction, role?: UserRole): boolean => {
    if (!role) return false;
    
    // Safety check for pending users
    if (role === 'pending') return false;

    // Administrators always have full access
    if (role === 'administrator') return true;
    if (action === 'manageSettings' && role !== 'administrator') return false;

    const settings = getSettings();
    const permissions = settings.rolePermissions;

    if (permissions && permissions[action] !== undefined) {
        const rolesWithPermission = permissions[action] || [];
        return rolesWithPermission.includes(role);
    }

    // Default fallback from PERMISSION_AREAS definitions if action isn't saved yet
    for (const area of PERMISSION_AREAS) {
        const actDef = area.actions.find(a => a.id === action);
        if (actDef) {
            return actDef.defaultRoles.includes(role);
        }
    }

    return false;
};
