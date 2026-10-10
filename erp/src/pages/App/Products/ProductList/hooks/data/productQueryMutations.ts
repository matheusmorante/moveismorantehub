export const persistAndInvalidateProductList = async <T>(
  persist: () => Promise<T>,
  invalidate: () => Promise<unknown>,
  onInvalidateError: (error: unknown) => void = (error) =>
    console.error('[Products] Falha ao atualizar o cache da lista:', error)
): Promise<T> => {
  let result: T;
  try {
    result = await persist();
  } catch (persistError) {
    try {
      await invalidate();
    } catch (invalidateError) {
      onInvalidateError(invalidateError);
    }
    throw persistError;
  }

  try {
    await invalidate();
  } catch (error) {
    onInvalidateError(error);
  }
  return result;
};
