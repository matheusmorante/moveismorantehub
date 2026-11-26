export interface SupplierDeletionCounts {
  productCount: number;
  purchaseCount: number;
  receiptCount: number;
  inventoryCount: number;
  invoiceCount: number;
  unavailabilityCount: number;
}

const blockerLabels: ReadonlyArray<[keyof SupplierDeletionCounts, string, string]> = [
  ['productCount', 'produto', 'produtos'],
  ['purchaseCount', 'pedido de compra', 'pedidos de compra'],
  ['receiptCount', 'recebimento', 'recebimentos'],
  ['inventoryCount', 'inventário registrado', 'inventários registrados'],
  ['invoiceCount', 'nota fiscal', 'notas fiscais'],
  ['unavailabilityCount', 'indisponibilidade de estoque', 'indisponibilidades de estoque'],
];

export const canDeleteSupplier = (
  counts: SupplierDeletionCounts | null | undefined
): counts is SupplierDeletionCounts =>
  Boolean(counts) && blockerLabels.every(([key]) => Number(counts?.[key]) === 0);

export const getSupplierDeletionBlockers = (
  counts: SupplierDeletionCounts | null | undefined
): string[] =>
  blockerLabels.flatMap(([key, singular, plural]) => {
    const count = Number(counts?.[key] ?? 0);
    return count > 0 ? [`${count} ${count === 1 ? singular : plural}`] : [];
  });
