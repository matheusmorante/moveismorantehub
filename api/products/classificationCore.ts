export type CategoryCandidate = { id: string; name: string; active: boolean; selectable: boolean };
export type NcmCandidate = {
  code: string;
  official_description: string;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
};

export function isCurrentNcm(candidate: NcmCandidate, today: string): boolean {
  return /^\d{8}$/.test(candidate.code) && candidate.active &&
    (!candidate.start_date || candidate.start_date <= today) &&
    (!candidate.end_date || candidate.end_date >= today);
}

export function validateCategoryChoice(
  choice: unknown,
  choices: Map<string, CategoryCandidate>,
  current: Map<string, CategoryCandidate>
): string | null {
  if (typeof choice !== 'string') return null;
  const offered = choices.get(choice);
  const latest = offered && current.get(offered.id);
  return latest?.active && latest.selectable ? latest.id : null;
}

export function validateNcmChoice(
  choice: unknown,
  choices: Map<string, NcmCandidate>,
  current: Map<string, NcmCandidate>,
  today: string
): NcmCandidate | null {
  if (typeof choice !== 'string') return null;
  const offered = choices.get(choice);
  const latest = offered && current.get(offered.code);
  return latest && isCurrentNcm(latest, today) ? latest : null;
}

export function buildNcmSearchTerms(title: string, category: string, material: string): string[] {
  const clean = title.toLowerCase().replace(/[^a-záéíóúâêôãõç0-9 ]/g, ' ').trim();
  const words = clean.split(/\s+/).filter((word) => word.length > 2);
  const terms = [clean];
  if (words.length >= 2) terms.push(`${words[0]} ${words[1]}`);
  if (words.length >= 3) terms.push(`${words[1]} ${words[2]}`);
  terms.push(...words, category.toLowerCase().split('/').pop()?.trim() || '', material.toLowerCase().trim());
  return [...new Set(terms.filter((term) => term.length >= 3))].slice(0, 5);
}
