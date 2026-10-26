export interface AccessProfileCandidate {
  role?: unknown;
  roles?: readonly unknown[] | null;
  address?: unknown;
}

export interface OperationalCollaboratorCandidate extends AccessProfileCandidate {
  type?: string;
  person_type?: string;
  deleted?: boolean;
}

const NON_ACCOUNTANT_ACCESS_ROLES = new Set([
  'administrator',
  'manager',
  'stockist',
  'seller',
  'deliverer',
  'administrador',
  'gestor',
  'estoquista',
  'vendedor',
  'entregador',
]);

const getAssignedAccessProfile = (
  candidate: AccessProfileCandidate
): AccessProfileCandidate => {
  if (candidate.address === undefined || candidate.address === null) return candidate;

  let address = candidate.address;
  if (typeof address === 'string') {
    try {
      address = JSON.parse(address);
    } catch {
      return {};
    }
  }

  return typeof address === 'object' && address !== null && !Array.isArray(address)
    ? (address as AccessProfileCandidate)
    : {};
};

export const getGrantedNonAccountantAccessRoles = (
  candidate: AccessProfileCandidate
): string[] => {
  const profile = getAssignedAccessProfile(candidate);
  const roles = [...(Array.isArray(profile.roles) ? profile.roles : []), profile.role];

  return roles.filter(
    (role): role is string =>
      typeof role === 'string' &&
      NON_ACCOUNTANT_ACCESS_ROLES.has(role.trim().toLowerCase())
  );
};

export const hasGrantedNonAccountantAccessProfile = (
  candidate: AccessProfileCandidate
): boolean => getGrantedNonAccountantAccessRoles(candidate).length > 0;

export const isEligibleOperationalCollaborator = (
  candidate: OperationalCollaboratorCandidate
): boolean => {
  if (candidate.deleted) return false;
  if ((candidate.type ?? candidate.person_type) !== 'employees') return false;
  return hasGrantedNonAccountantAccessProfile(candidate);
};
