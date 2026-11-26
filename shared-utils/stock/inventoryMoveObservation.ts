const parseStockQuantity = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;

  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : null;
};

const formatStockQuantity = (quantity: number): string =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(quantity);

/** Converts inventory-audit metadata into the readable stock observation shown in history. */
export const formatInventoryAuditObservation = (
  metadata: Record<string, unknown>
): string | null => {
  if (metadata.source !== 'inventory_audit') return null;

  const note = metadata.note ?? metadata.observation ?? metadata.reason;
  if (typeof note === 'string' && note.trim()) return note.trim();

  const previousStock = parseStockQuantity(metadata.previousStock);
  const targetStock = parseStockQuantity(metadata.targetStock);

  if (previousStock !== null && targetStock !== null) {
    return `Saldo anterior: ${formatStockQuantity(previousStock)} un. | Saldo após inventário: ${formatStockQuantity(targetStock)} un.`;
  }
  if (targetStock !== null) {
    return `Saldo após inventário: ${formatStockQuantity(targetStock)} un.`;
  }

  return 'Ajuste de saldo registrado pelo inventário.';
};
