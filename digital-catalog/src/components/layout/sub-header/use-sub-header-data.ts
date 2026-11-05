'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogCategoriesQuery, catalogRelationshipsQuery } from '@/lib/catalog-menu-queries';
import type { Category, Relationship } from './types';

export function useSubHeaderData() {
  const { data: allCategories = [], isLoading } = useQuery(catalogCategoriesQuery);
  const { data: relationships = [], isLoading: relationshipsLoading } = useQuery(catalogRelationshipsQuery);
  const environments = allCategories.filter((c: Category) => c.type === 'environment');
  const categories = allCategories.filter((c: Category) => c.type === 'category');

  function getCategoriesForEnv(envId: string): Category[] {
    const linkedIds = relationships.filter((r) => r.parent_id === envId).map((r) => r.child_id);
    return categories.filter((c) => linkedIds.includes(c.id));
  }

  return { environments, getCategoriesForEnv, isLoaded: !isLoading && !relationshipsLoading };
}
