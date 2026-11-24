export function updateProductReconciliationSelection(
  currentIds: ReadonlySet<string>,
  productId: string,
  isSelected: boolean
): Set<string> {
  const next = new Set(currentIds);
  if (isSelected) next.add(productId);
  else next.delete(productId);
  return next;
}

export function updateProductReconciliationPageSelection<T extends { id: string }>(
  currentIds: ReadonlySet<string>,
  pageProducts: readonly T[],
  isSelected: boolean
): Set<string> {
  const next = new Set(currentIds);
  pageProducts.forEach(({ id }) => {
    if (isSelected) next.add(id);
    else next.delete(id);
  });
  return next;
}

export function areAllProductReconciliationPageItemsSelected<T extends { id: string }>(
  selectedIds: ReadonlySet<string>,
  pageProducts: readonly T[]
): boolean {
  return pageProducts.length > 0 && pageProducts.every(({ id }) => selectedIds.has(id));
}
