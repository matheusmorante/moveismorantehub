import { UserRole } from '@/context/AuthContext';
import { canPerform } from './permissionService';
import {
  getProductProfileRoles,
  isProductIdentificationLabelOnlyProfile as isLabelOnlyProductProfile,
  isStockistOnlyProductProfile,
  shouldHideProductCatalogPublicationStatus,
} from '../../../../shared-utils/productPermissions';

export const SYSTEM_ROLES: Array<[Exclude<UserRole, 'pending'>, string]> = [
  ['administrator', 'Administrador'],
  ['manager', 'Gestor'],
  ['stockist', 'Estoquista'],
  ['seller', 'Vendedor'],
  ['deliverer', 'Entregador / Montador'],
  ['accountant', 'Contador'],
];

const priority: UserRole[] = [
  'administrator',
  'manager',
  'stockist',
  'deliverer',
  'seller',
  'accountant',
];

type ProfileRoleSource = { role?: UserRole; roles?: UserRole[] | null };

export const getProfileRoles = (profile: {
  role?: UserRole;
  roles?: UserRole[] | null;
}): UserRole[] => getProductProfileRoles(profile) as UserRole[];

export const isStockistOnlyProfile = (profile?: {
  role?: UserRole;
  roles?: UserRole[] | null;
} | null): boolean => {
  return isStockistOnlyProductProfile(profile);
};

export const isProductIdentificationLabelOnlyProfile = (
  profile?: { role?: UserRole; roles?: UserRole[] | null } | null
): boolean => isLabelOnlyProductProfile(profile ? getProfileRoles(profile) : []);

export const shouldHideCatalogPublicationStatus = (
  profile?: { role?: UserRole; roles?: UserRole[] | null } | null
): boolean => shouldHideProductCatalogPublicationStatus(profile);

export const canPrintProductIdentificationLabels = (
  profile?: ProfileRoleSource | null
): boolean => {
  const roles = profile ? getProfileRoles(profile) : [];
  return canPerform('printProductIdentificationLabels', roles);
};

export const getPrimaryRole = (roles: UserRole[]): UserRole =>
  priority.find((role) => roles.includes(role)) || 'pending';

export const roleLabel = (role: UserRole) =>
  SYSTEM_ROLES.find(([value]) => value === role)?.[1] || 'Sem acesso';

/**
 * Verifica se um registro de pessoa é um colaborador válido e ativo para seleção (ex: vendedor, atendente).
 * Requer estar ativo, não deletado, ser do tipo 'employees' ou possuir cargo/role válido (não 'pending').
 */
export const isValidEmployee = (person?: any): boolean => {
  if (!person || person.active === false || person.deleted === true) return false;

  // Obter papéis/roles
  const rolesList: UserRole[] =
    Array.isArray(person.roles) && person.roles.length > 0
      ? person.roles
      : person.role
        ? [person.role]
        : [];

  const hasValidRole = rolesList.some((r) => r && r !== 'pending');
  const isEmployeeType = person.type === 'employees' || person.person_type === 'employees';

  // Se for do tipo employees e possuir role 'pending' exclusiva, não tem acesso
  if (rolesList.length === 1 && rolesList[0] === 'pending') {
    return false;
  }

  return isEmployeeType || hasValidRole;
};
