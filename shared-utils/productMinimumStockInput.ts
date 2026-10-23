/** Keeps stock-minimum edits aligned with the ERP's integer input behavior. */
export const parseProductMinimumStockInput = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};
