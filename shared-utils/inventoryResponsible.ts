import { isEligibleOperationalCollaborator } from './operationalCollaborators';

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
  return isEligibleOperationalCollaborator(person);
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
