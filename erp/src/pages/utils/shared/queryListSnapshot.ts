/** Whether a local list snapshot belongs to a failed query key and must be discarded. */
export const shouldClearQueryListSnapshot = <T>(
  queryData: T | undefined,
  queryError: unknown
): boolean => queryData === undefined && queryError != null;
