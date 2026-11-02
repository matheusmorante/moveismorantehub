import type { Category } from '@/pages/utils/categoryService';

export type CategoryRelation = { parent_id: string; child_id: string };
export type CategoryOption = Pick<Category, 'id' | 'name' | 'slug'>;

export const flattenCategories = (
  categories: CategoryOption[],
  relations: CategoryRelation[],
): Array<{ category: CategoryOption; depth: number }> => {
  const allowed = new Set(categories.map((category) => category.id));
  const byId = new Map(categories.map((category) => [category.id, category]));
  const children = new Map<string, string[]>();
  const childIds = new Set<string>();
  for (const relation of relations) {
    if (!allowed.has(relation.child_id) || !allowed.has(relation.parent_id)) continue;
    childIds.add(relation.child_id);
    children.set(relation.parent_id, [...(children.get(relation.parent_id) || []), relation.child_id]);
  }

  const sortIds = (ids: string[]) => ids.sort((a, b) =>
    (byId.get(a)?.name || '').localeCompare(byId.get(b)?.name || '', 'pt-BR')
  );
  const result: Array<{ category: CategoryOption; depth: number }> = [];
  const visited = new Set<string>();
  const addTree = (id: string, depth: number) => {
    if (visited.has(id)) return;
    const category = byId.get(id);
    if (!category) return;
    visited.add(id);
    result.push({ category, depth });
    for (const childId of sortIds([...(children.get(id) || [])])) addTree(childId, depth + 1);
  };

  for (const category of categories) {
    if (!childIds.has(category.id)) addTree(category.id, 0);
  }
  for (const category of categories) addTree(category.id, 0);
  return result;
};
