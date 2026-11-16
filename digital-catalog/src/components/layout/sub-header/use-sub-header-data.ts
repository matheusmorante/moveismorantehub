'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogCategoriesQuery, catalogRelationshipsQuery } from '@/lib/catalog-menu-queries';
import type { Category } from './types';

export function useSubHeaderData(loadRelationships: boolean) {
  const categoriesQuery = useQuery(catalogCategoriesQuery);
  const allCategories = categoriesQuery.data || [];
  const environments = allCategories.filter((c: Category) => c.type === 'environment');
  const categories = allCategories.filter((c: Category) => c.type === 'category');
  const relationshipsQuery = useQuery({
    ...catalogRelationshipsQuery,
    enabled: loadRelationships && environments.length > 0,
  });
  const relationships = relationshipsQuery.data || [];

  function getCategoriesForEnv(envId: string): Category[] {
    const linkedIds = relationships.filter((r) => r.parent_id === envId).map((r) => r.child_id);
    return categories.filter((c) => linkedIds.includes(c.id));
  }

  return {
    environments,
    getCategoriesForEnv,
    isLoaded: !categoriesQuery.isLoading,
    relationshipsLoading: relationshipsQuery.isFetching,
    relationshipsError: relationshipsQuery.isError,
    retryRelationships: relationshipsQuery.refetch,
  };
}
