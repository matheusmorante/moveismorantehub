export const formatPurchaseNumber = (purchaseNumber?: number | null): string | undefined => {
  if (purchaseNumber == null || !Number.isInteger(purchaseNumber) || purchaseNumber < 1) {
    return undefined;
  }

  return String(purchaseNumber).padStart(4, '0');
};
