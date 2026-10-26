import { UserRole } from '@/context/AuthContext';
import { canPerform } from './permissionService';
import { isEligibleOperationalCollaborator } from '../../../../shared-utils/operationalCollaborators';
import {
  canShowProductVariationActionsMenu,
  getProductIdentificationLabelActionAvailability,
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

export { getProductIdentificationLabelActionAvailability };
export { canShowProductVariationActionsMenu };

export const getPrimaryRole = (roles: UserRole[]): UserRole =>
  priority.find((role) => roles.includes(role)) || 'pending';

export const roleLabel = (role: UserRole) =>
  SYSTEM_ROLES.find(([value]) => value === role)?.[1] || 'Sem acesso';

/**
 * Verifica se a pessoa pode ser atribuída a uma responsabilidade operacional.
 * O cargo informado não substitui um perfil de acesso concedido; Contador não é elegível.
 */
export const isValidEmployee = (person?: any): boolean => {
  return Boolean(
    person && person.active !== false && isEligibleOperationalCollaborator(person)
  );
};
