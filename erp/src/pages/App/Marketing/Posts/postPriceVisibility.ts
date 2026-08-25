export function shouldShowPreviousPrice(price: number, promotionalPrice: number | null | undefined, isTemplate: boolean) {
  if (!Number.isFinite(price) || price <= 0) return false;
  if (isTemplate) return true;
  return typeof promotionalPrice === 'number'
    && Number.isFinite(promotionalPrice)
    && promotionalPrice > 0
    && promotionalPrice < price;
}
