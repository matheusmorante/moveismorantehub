import type { FinancialCategory } from '../../../services/mobileFinanceService';
import { sortCategoriesWithOthersAtEnd } from '../../../services/financial/mobileCategoryService';

export interface CategoryTreeRow {
  category: FinancialCategory;
  depth: number;
  ancestors: string[];
  hasChildren: boolean;
}

export const buildCategoryTreeRows = (categories: FinancialCategory[]): CategoryTreeRow[] => {
  const ordered = sortCategoriesWithOthersAtEnd(categories);
  const categoryById = new Map(ordered.map((category) => [category.id, category]));
  const orderById = new Map(ordered.map((category, index) => [category.id, index]));
  const childrenByParent = new Map<string, FinancialCategory[]>();

  ordered.forEach((category) => {
    if (!category.parent_id || !categoryById.has(category.parent_id)) return;
    const children = childrenByParent.get(category.parent_id) || [];
    children.push(category);
    childrenByParent.set(category.parent_id, children);
  });

  const rows: CategoryTreeRow[] = [];
  const visited = new Set<string>();
  const visit = (category: FinancialCategory, depth: number, ancestors: string[]) => {
    if (visited.has(category.id)) return;
    visited.add(category.id);
    const children = (childrenByParent.get(category.id) || []).sort(
      (a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0)
    );
    rows.push({ category, depth, ancestors, hasChildren: children.length > 0 });
    children.forEach((child) => visit(child, depth + 1, [...ancestors, category.id]));
  };

  ordered
    .filter((category) => !category.parent_id || !categoryById.has(category.parent_id))
    .forEach((root) => visit(root, 0, []));
  ordered.forEach((category) => visit(category, 0, []));
  return rows;
};
