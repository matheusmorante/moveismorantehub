export const getGoodsReceiptIndex = (
  receipt?: { receiptIndex?: number | null } | Record<string, any>
): number | null => {
  if (!receipt) return null;
  const raw = receipt.receiptIndex ?? (receipt as any).receipt_index;
  const code = Number(raw);
  return Number.isInteger(code) && code > 0 && code <= MAX_RECEIPT_CODE ? code : null;
};

export const formatGoodsReceiptCode = (
  receipt?: { receiptIndex?: number | null } | Record<string, any>
): string => {
  const code = getGoodsReceiptIndex(receipt);
  return code ? String(code).padStart(6, '0') : '—';
};
