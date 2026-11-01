export interface SupplierStageItem {
  assignedSupplier?: string | null;
  physicalCount: number | null;
  countedAt?: string;
  supplierStageStarted?: boolean;
  supplierStageReset?: boolean;
  scannedLabelIds?: string[];
  countedLabelIds?: string[];
}

/** Sums the recorded physical quantities; untouched rows contribute zero. */
export const sumInventoryCountedQuantities = (
  items: readonly Pick<SupplierStageItem, 'physicalCount'>[]
): number =>
  items.reduce(
    (total, item) =>
      total + (typeof item.physicalCount === 'number' && Number.isFinite(item.physicalCount)
        ? item.physicalCount
        : 0),
    0
  );

export const getSupplierStageName = (item: SupplierStageItem): string =>
  item.assignedSupplier || 'Sem fornecedor';

export const initializeGeneralInventoryCounts = <
  T extends SupplierStageItem & { productId: string },
>(
  items: T[],
  startedAt = new Date().toISOString()
): T[] => {
  let changed = false;
  const initializedItems = items.map((item) => {
    if (!item.productId || typeof item.physicalCount === 'number') return item;
    changed = true;
    return { ...item, physicalCount: 0, countedAt: item.countedAt || startedAt };
  });
  return changed ? initializedItems : items;
};

export const startSupplierStageItems = <T extends SupplierStageItem>(
  items: readonly T[],
  supplierName: string,
  startedAt = new Date().toISOString()
): T[] =>
  items.map((item) =>
    getSupplierStageName(item) === supplierName
      ? ({
          ...item,
          supplierStageStarted: true,
          physicalCount: item.physicalCount ?? 0,
          countedAt: item.countedAt || startedAt,
        } as T)
      : item
  );

export const resetSupplierStageItems = <T extends SupplierStageItem>(
  items: readonly T[],
  supplierName: string
): T[] =>
  items.map((item) =>
    getSupplierStageName(item) === supplierName
      ? ({
          ...item,
          supplierStageStarted: false,
          supplierStageReset: true,
          physicalCount: null,
          countedAt: undefined,
          ...(item.scannedLabelIds !== undefined ? { scannedLabelIds: [] } : {}),
          ...(item.countedLabelIds !== undefined ? { countedLabelIds: [] } : {}),
        } as T)
      : item
  );

/** Excludes untouched suppliers and treats empty rows in started stages as zero. */
export const prepareSupplierStageReviewItems = <T extends SupplierStageItem>(
  items: readonly T[],
  hasStages: boolean,
  reviewedAt = new Date().toISOString()
): T[] => {
  if (!hasStages) return items.map((item) => ({ ...item }));

  const startedSuppliers = new Set(
    items
      .filter(
        (item) => item.supplierStageStarted === true || typeof item.physicalCount === 'number'
      )
      .map(getSupplierStageName)
      .filter((supplierName) => supplierName !== 'Sem fornecedor')
  );

  return items
    .filter((item) => startedSuppliers.has(getSupplierStageName(item)))
    .map((item) => ({
      ...item,
      physicalCount: item.physicalCount ?? 0,
      countedAt: item.countedAt || (item.physicalCount === null ? reviewedAt : undefined),
    }) as T);
};
