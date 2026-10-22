export const FISCAL_OPERATOR_ROLES = ['manager', 'administrator'] as const;

const fiscalOperatorRoles = new Set<string>(FISCAL_OPERATOR_ROLES);

function getFiscalProfileRoles(profile: FiscalRoleProfile | null | undefined): Set<string> {
  const roles = new Set<string>();
  if (typeof profile?.role === 'string') roles.add(profile.role);
  if (Array.isArray(profile?.roles)) {
    for (const role of profile.roles) {
      if (typeof role === 'string') roles.add(role);
    }
  }
  return roles;
}

export interface FiscalRoleProfile {
  role?: unknown;
  roles?: unknown;
}

/** Uses only the role fields stored in the protected profiles table. */
export function hasFiscalOperationRole(profile: FiscalRoleProfile | null | undefined): boolean {
  return Array.from(getFiscalProfileRoles(profile)).some((role) => fiscalOperatorRoles.has(role));
}

/** Read-only export access is available to verified accountants and fiscal operators. */
export function hasFiscalExportRole(profile: FiscalRoleProfile | null | undefined): boolean {
  const roles = getFiscalProfileRoles(profile);
  return roles.has('accountant') || Array.from(roles).some((role) => fiscalOperatorRoles.has(role));
}

export function hasFiscalAdministratorRole(profile: FiscalRoleProfile | null | undefined): boolean {
  return (
    profile?.role === 'administrator' ||
    (Array.isArray(profile?.roles) && profile.roles.includes('administrator'))
  );
}
