const PAGE_SIZE = 1000;

type CategoryPage<Row, QueryError> = { data: Row[] | null; error: QueryError | null };

/** Reads a fixed category scope without treating the PostgREST page limit as a complete result. */
export async function readProductTechnicalCategoryRows<Row, QueryError>(
  categoryIds: string[],
  readPage: (ids: string[], from: number, to: number) => PromiseLike<CategoryPage<Row, QueryError>>
): Promise<CategoryPage<Row, QueryError>> {
  const rows: Row[] = [];
  if (!categoryIds.length) return { data: rows, error: null };

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await readPage(categoryIds, from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
