export interface InventoryResponsibleCandidate {
  id?: string | number;
  type?: string;
  person_type?: string;
  role?: unknown;
  roles?: readonly unknown[] | null;
  address?: unknown;
  position?: string;
  fullName?: string;
  full_name?: string;
  socialName?: string;
  social_name?: string;
  nickname?: string;
  deleted?: boolean;
}

const getPersonType = (person: InventoryResponsibleCandidate) => person.type ?? person.person_type;

const ACCESS_PROFILE_ROLES = new Set([
  'administrator',
  'manager',
  'stockist',
  'seller',
  'deliverer',
  'accountant',
]);

const getAssignedAccessProfile = (person: InventoryResponsibleCandidate) => {
  if (person.address === undefined || person.address === null) return person;

  let address = person.address;
  if (typeof address === 'string') {
    try {
      address = JSON.parse(address);
    } catch {
      return {};
    }
  }

  return typeof address === 'object' && !Array.isArray(address) && address !== null
    ? (address as { role?: unknown; roles?: readonly unknown[] | null })
    : {};
};

const hasGrantedAccessProfile = (person: InventoryResponsibleCandidate): boolean => {
  const profile = getAssignedAccessProfile(person);
  const roleValues = [
    ...(Array.isArray(profile.roles) ? profile.roles : []),
    profile.role,
  ];

  return roleValues.some(
    (role) =>
      typeof role === 'string' && ACCESS_PROFILE_ROLES.has(role.trim().toLowerCase())
  );
};

export const getInventoryResponsibleDisplayName = (
  person?: InventoryResponsibleCandidate
): string =>
  person?.fullName ||
  person?.full_name ||
  person?.socialName ||
  person?.social_name ||
  person?.nickname ||
  'Responsável não informado';

export const isEligibleInventoryResponsible = (person: InventoryResponsibleCandidate): boolean => {
  if (person.deleted) return false;
  if (getPersonType(person) !== 'employees') return false;
  return hasGrantedAccessProfile(person);
};

export const filterInventoryResponsibleCandidates = <T extends InventoryResponsibleCandidate>(
  candidates: readonly T[]
): T[] => candidates.filter(isEligibleInventoryResponsible);

export const findDefaultInventoryResponsibleId = (
  candidates: readonly InventoryResponsibleCandidate[],
  profileId?: string | null
): string => {
  if (!profileId) return '';
  const match = filterInventoryResponsibleCandidates(candidates).find(
    (candidate) => String(candidate.id) === profileId
  );
  return match?.id == null ? '' : String(match.id);
};
