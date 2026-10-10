export const persistAndInvalidateProductList = async <T>(
  persist: () => Promise<T>,
  invalidate: () => Promise<unknown>,
  onInvalidateError: (error: unknown) => void = (error) =>
    console.error('[Products] Falha ao atualizar o cache da lista:', error)
): Promise<T> => {
  const result = await persist();
  try {
    await invalidate();
  } catch (error) {
    onInvalidateError(error);
  }
  return result;
};
