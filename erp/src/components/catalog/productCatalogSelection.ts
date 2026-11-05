import type { Dispatch, SetStateAction } from 'react';
import type { ProductCatalogPrepareInput } from '../../../../shared-utils/productCatalogFormSchemas';
import type { CatalogItem } from './productCatalogPresentation';
import { itemKey } from './productCatalogItems';

type BulkScope = NonNullable<ProductCatalogPrepareInput['bulkScope']>;

interface ProductCatalogSelectionActionsInput {
  selectedItems: Map<string, CatalogItem>;
  setSelectedItems: Dispatch<SetStateAction<Map<string, CatalogItem>>>;
  bulkScope: BulkScope | null;
  setBulkScope: Dispatch<SetStateAction<BulkScope | null>>;
  currentScope: BulkScope;
  total: number;
  setSelectionError: (message: string) => void;
  setPrepared: Dispatch<SetStateAction<ProductCatalogPrepareInput | null>>;
  clearPreparedItemsError: () => void;
}

const scopeKey = (scope: Pick<BulkScope, 'filters'>) =>
  JSON.stringify([scope.filters.categoryId, scope.filters.search.trim().toLocaleLowerCase(), scope.filters.brand]);

export function createProductCatalogSelectionActions({
  selectedItems,
  setSelectedItems,
  bulkScope,
  setBulkScope,
  currentScope,
  total,
  setSelectionError,
  setPrepared,
  clearPreparedItemsError,
}: ProductCatalogSelectionActionsInput) {
  const hasMatchingBulkScope = Boolean(
    bulkScope && scopeKey(bulkScope) === scopeKey(currentScope)
  );
  const selectedCount = Math.max(0, (bulkScope?.total || 0) - (bulkScope?.excludedProductIds.length || 0)) + selectedItems.size;

  const toggleBulkSelection = () => {
    if (hasMatchingBulkScope) {
      setBulkScope(null);
      setPrepared(null);
      return;
    }
    if (bulkScope) {
      setSelectionError('Remova a seleção em lote atual antes de selecionar outra lista inteira.');
      return;
    }
    if (total === 0) return;
    setBulkScope({ ...currentScope });
    setSelectionError('');
    setPrepared(null);
  };

  const toggleBulkProduct = (productId: string) => {
    if (!bulkScope || !hasMatchingBulkScope) return;
    const isExcluded = bulkScope.excludedProductIds.includes(productId);
    if (!isExcluded && bulkScope.excludedProductIds.length >= 100) {
      setSelectionError('Você pode remover até 100 produtos desta seleção em lote. Refine os filtros para remover um grupo maior.');
      return;
    }
    setBulkScope((current) => current ? {
      ...current,
      excludedProductIds: isExcluded
        ? current.excludedProductIds.filter((id) => id !== productId)
        : [...current.excludedProductIds, productId],
    } : null);
    setSelectedItems((current) => new Map(Array.from(current.entries()).filter(([, item]) => item.productId !== productId)));
    setPrepared(null);
    setSelectionError('');
  };

  const toggleProduct = (item: CatalogItem, productId = item.productId) => {
    if (hasMatchingBulkScope && bulkScope) {
      toggleBulkProduct(productId);
      return;
    }
    const key = itemKey(item);
    if (!selectedItems.has(key) && selectedItems.size >= 500) {
      setSelectionError('A seleção individual chegou ao limite de 500 itens. Selecione uma lista completa por categoria.');
      return;
    }
    setSelectedItems((previous) => {
      const next = new Map(previous);
      if (next.has(key)) next.delete(key);
      else next.set(key, item);
      return next;
    });
    setPrepared(null);
    setSelectionError('');
  };

  const clearSelection = () => {
    setSelectedItems(new Map());
    setBulkScope(null);
    setSelectionError('');
    setPrepared(null);
    clearPreparedItemsError();
  };

  const clearBulkSelection = () => {
    setBulkScope(null);
    setPrepared(null);
  };

  const removeSelectedItem = (key: string) => {
    setSelectedItems((current) => {
      const next = new Map(current);
      next.delete(key);
      return next;
    });
    setPrepared(null);
  };

  const removeManualProductSelections = (productId: string) => {
    setSelectedItems((current) => new Map(Array.from(current.entries()).filter(([, item]) => item.productId !== productId)));
    setPrepared(null);
  };

  const toggleProductCard = (
    productId: string,
    selectedManualItemCount: number,
    simpleItem: CatalogItem | null,
  ) => {
    if (hasMatchingBulkScope && bulkScope) {
      const isExcluded = bulkScope.excludedProductIds.includes(productId);
      if (isExcluded && selectedManualItemCount > 0) {
        removeManualProductSelections(productId);
      } else toggleBulkProduct(productId);
    } else if (simpleItem) toggleProduct(simpleItem, productId);
  };

  return {
    hasMatchingBulkScope,
    selectedCount,
    toggleBulkSelection,
    toggleBulkProduct,
    toggleProduct,
    clearSelection,
    clearBulkSelection,
    removeSelectedItem,
    toggleProductCard,
  };
}
