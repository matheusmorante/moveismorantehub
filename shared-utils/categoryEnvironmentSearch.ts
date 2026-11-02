import { removeAccents } from './productText';

export interface EnvironmentSearchCategory {
  id: string;
  name: string;
}

export interface EnvironmentSearchItem {
  name: string;
  categories?: readonly string[] | null;
}

/**
 * Search environments by their own name or the name of a linked category.
 * Keep the raw non-empty query to match the ERP category-management screen.
 */
export function filterEnvironmentsBySearch<TEnvironment extends EnvironmentSearchItem>(
  environments: TEnvironment[],
  categories: readonly EnvironmentSearchCategory[],
  searchTerm: string
): TEnvironment[] {
  if (!searchTerm.trim()) return environments;

  // Keep leading/trailing spaces meaningful while comparing case- and accent-insensitively.
  const normalizeForSearch = (value: string) => removeAccents(value).toLowerCase();
  const normalizedTerm = normalizeForSearch(searchTerm);
  return environments.filter((environment) => {
    if (normalizeForSearch(environment.name).includes(normalizedTerm)) return true;

    return categories.some(
      (category) =>
        environment.categories?.includes(category.id) &&
        normalizeForSearch(category.name).includes(normalizedTerm)
    );
  });
}

