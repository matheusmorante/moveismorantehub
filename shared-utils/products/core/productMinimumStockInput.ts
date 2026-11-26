/** Keeps stock-minimum edits aligned with the ERP's integer input behavior. */
export const parseProductMinimumStockInput = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Mirrors the ERP input's blank presentation for nullish and NaN values. */
export const getProductMinimumStockInputDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  return String(value);
};
