import { matchesSearchText } from '../../../../../../shared-utils/searchText';
import type { ScopeProduct } from '../hooks/useInventoryScopeBuilder';
import type { SearchableProduct } from '../modals/InventoryProductSearchModal';

interface InventoryScopeProductParent {
  id: string;
  name: string;
  code: string;
  variationCount: number;
}

export const buildInventoryScopeProductParents = (
  productScopeProducts: readonly ScopeProduct[]
): InventoryScopeProductParent[] => {
  const byId = new Map<string, InventoryScopeProductParent>();
  for (const item of productScopeProducts) {
    if (!item.id || !item.variation_id || item.active !== true) continue;
    const id = String(item.id);
    const parent = byId.get(id);
    if (parent) {
      parent.variationCount += 1;
    } else {
      byId.set(id, {
        id,
        name: item.parent_name || item.description || item.name || 'Produto',
        code: item.code || item.sku || '',
        variationCount: 1,
      });
    }
  }
  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
};

export const searchInventoryScopeProductParents = async (
  productParents: readonly InventoryScopeProductParent[],
  query: string
): Promise<SearchableProduct[]> => (
  productParents
    .filter((product) => matchesSearchText(`${product.name} ${product.code}`, query))
    .slice(0, 5)
    .map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.code,
      code: product.code,
      stock: 0,
      unit: 'UN',
      resultMeta: [
        product.code ? `Código: ${product.code}` : '',
        `${product.variationCount} variações ativas`,
      ].filter(Boolean).join(' · '),
      active: true,
    }))
);
