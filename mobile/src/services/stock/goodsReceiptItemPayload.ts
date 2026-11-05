type GoodsReceiptRpcItemCosts = {
  freightFiscalUnit?: number;
  freightNonFiscalUnit?: number;
  discountUnit?: number;
  otherExpensesFiscalUnit?: number;
  otherExpensesNonFiscalUnit?: number;
  additionalCostUnit?: number;
};

export const mapGoodsReceiptItemsForRpc = <T extends GoodsReceiptRpcItemCosts>(
  items: T[],
) =>
  items.map((item) => ({
    ...item,
    freightFiscalUnit: item.freightFiscalUnit || 0,
    freightNonFiscalUnit: item.freightNonFiscalUnit || 0,
    discountUnit: item.discountUnit || 0,
    otherExpensesFiscalUnit: item.otherExpensesFiscalUnit || 0,
    otherExpensesNonFiscalUnit: item.otherExpensesNonFiscalUnit || 0,
    additionalCostUnit: item.additionalCostUnit || 0,
  }));
