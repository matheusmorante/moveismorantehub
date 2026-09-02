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
export const canPerform = (action: PermissionAction, role?: UserRole | UserRole[]): boolean => {
    if (!role) return false;
    
    // Normaliza para array
    const roles = Array.isArray(role) ? role : [role];
    if (roles.length === 0 || (roles.length === 1 && roles[0] === 'pending')) return false;

    // Administrators always have full access
    if (roles.includes('administrator')) return true;
    if (action === 'manageSettings') return false;

    const settings = getSettings();
    const permissions = settings.rolePermissions;

    if (permissions && permissions[action] !== undefined) {
        const rolesWithPermission = permissions[action] || [];
        return rolesWithPermission.some(r => roles.includes(r as UserRole));
    }

    // Default fallback from PERMISSION_AREAS definitions if action isn't saved yet
    for (const area of PERMISSION_AREAS) {
        const actDef = area.actions.find(a => a.id === action);
        if (actDef) {
            return actDef.defaultRoles.some(r => roles.includes(r));
        }
    }

    return false;
};
