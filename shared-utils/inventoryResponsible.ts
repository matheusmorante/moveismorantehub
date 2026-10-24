export interface InventoryResponsibleCandidate {
  id?: string | number;
  type?: string;
  person_type?: string;
  role?: string;
  roles?: string[];
  position?: string;
  fullName?: string;
  full_name?: string;
  socialName?: string;
  social_name?: string;
  nickname?: string;
  deleted?: boolean;
}

const getPersonType = (person: InventoryResponsibleCandidate) => person.type ?? person.person_type;

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
  const type = getPersonType(person);
  if (type && type !== 'employees') return false;

  const role = person.role || person.roles?.[0] || (type === 'employees' ? 'seller' : undefined);
  const hasValidSystemRole = Boolean(role && role !== 'pending');
  const position = person.position?.trim() || '';
  const hasValidPosition = Boolean(position && position !== 'Sem Acesso');
  return hasValidSystemRole || hasValidPosition;
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
