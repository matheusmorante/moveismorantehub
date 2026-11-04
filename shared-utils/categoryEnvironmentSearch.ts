import { removeAccents } from './productText';
import { matchesSearchText } from './searchText';

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
 * Match all typed words without depending on their order.
 */
export function filterEnvironmentsBySearch<TEnvironment extends EnvironmentSearchItem>(
  environments: TEnvironment[],
  categories: readonly EnvironmentSearchCategory[],
  searchTerm: string
): TEnvironment[] {
  if (!searchTerm.trim()) return environments;

  const normalizeForSearch = (value: string) => removeAccents(value).toLowerCase();
  const normalizedTerm = normalizeForSearch(searchTerm);
  return environments.filter((environment) => {
    if (matchesSearchText(normalizeForSearch(environment.name), normalizedTerm)) return true;

    return categories.some(
      (category) =>
        environment.categories?.includes(category.id) &&
        matchesSearchText(normalizeForSearch(category.name), normalizedTerm)
    );
  });
}

