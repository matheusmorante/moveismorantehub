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

  const normalizedTerm = searchTerm.toLowerCase();
  return environments.filter((environment) => {
    if (environment.name.toLowerCase().includes(normalizedTerm)) return true;

    return categories.some(
      (category) =>
        environment.categories?.includes(category.id) &&
        category.name.toLowerCase().includes(normalizedTerm)
    );
  });
}
