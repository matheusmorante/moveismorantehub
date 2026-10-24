import { withTimeout } from './withTimeout';

export const CATALOG_ATTRIBUTES_LOAD_TIMEOUT_MS = 15_000;

type LoadOutcome<T> = { timedOut: true } | { timedOut: false; value: T };

/** Bounds attribute catalogue/configuration reads and rejects on timeout. */
export async function withCatalogAttributesLoadTimeout<T>(
  query: PromiseLike<T>,
  label: string,
): Promise<T> {
  const outcome = await withTimeout<LoadOutcome<T>>(
    Promise.resolve(query).then((value) => ({ timedOut: false as const, value })),
    CATALOG_ATTRIBUTES_LOAD_TIMEOUT_MS,
    { timedOut: true },
    label,
  );

  if (outcome.timedOut) {
    throw new Error(
      `O carregamento das características excedeu ${CATALOG_ATTRIBUTES_LOAD_TIMEOUT_MS / 1000} segundos.`,
    );
  }

  return outcome.value;
}
