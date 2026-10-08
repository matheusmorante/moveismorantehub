/** Recebe order_data carregado no servidor; cenário ou nome nunca substituem is_test. */
export const isSyntheticOrderBlockedInProduction = (
  environment: number,
  persistedOrderData: unknown
): boolean => {
  if (environment !== 1 || !persistedOrderData || typeof persistedOrderData !== 'object') {
    return false;
  }
  return (persistedOrderData as Record<string, unknown>).is_test === true;
};
