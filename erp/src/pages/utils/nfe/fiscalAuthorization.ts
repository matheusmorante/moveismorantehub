export const FISCAL_OPERATOR_ROLES = ['manager', 'administrator'] as const;

const fiscalOperatorRoles = new Set<string>(FISCAL_OPERATOR_ROLES);

export interface FiscalRoleProfile {
  role?: unknown;
  roles?: unknown;
}

/** Uses only the role fields stored in the protected profiles table. */
export function hasFiscalOperationRole(profile: FiscalRoleProfile | null | undefined): boolean {
  if (!profile) return false;

  const roles = new Set<string>();
  if (typeof profile.role === 'string') roles.add(profile.role);
  if (Array.isArray(profile.roles)) {
    for (const role of profile.roles) {
      if (typeof role === 'string') roles.add(role);
    }
  }

  return Array.from(roles).some((role) => fiscalOperatorRoles.has(role));
}
