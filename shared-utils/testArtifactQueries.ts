/** PostgREST filters are evaluated before range/limit and on the embedded table. */
export const NON_TEST_ARTIFACT_FILTER = [
  'order_data.is.null,',
  'and(',
  'or(order_data->>is_test.is.null,order_data->>is_test.neq.true),',
  'or(order_data->>isTest.is.null,order_data->>isTest.neq.true),',
  'or(order_data->testArtifact->>is_test.is.null,order_data->testArtifact->>is_test.neq.true)',
  ')',
].join('');

export const NON_TEST_ORDER_FILTER = NON_TEST_ARTIFACT_FILTER;

export function excludeTestArtifacts<T>(
  query: { or: (filters: string) => T },
): T {
  return query.or(NON_TEST_ARTIFACT_FILTER);
}

export function excludeTestOrders<T>(
  query: { or: (filters: string, options?: { referencedTable?: string }) => T },
  referencedTable?: string,
): T {
  return referencedTable
    ? query.or(NON_TEST_ARTIFACT_FILTER, { referencedTable })
    : excludeTestArtifacts(query);
}
