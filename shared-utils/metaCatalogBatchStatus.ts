export interface MetaCatalogBatchStatusCheckOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

interface MetaCatalogBatchStatusRow {
  handle?: unknown;
  status?: unknown;
  errors_total_count?: unknown;
  errors?: unknown;
}

function statusRow(value: unknown, handle: string): MetaCatalogBatchStatusRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const response = value as Record<string, unknown>;
  const data = response.data;
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? [data]
      : [response];
  const matching = rows.find(
    (row) =>
      row &&
      typeof row === 'object' &&
      !Array.isArray(row) &&
      ((row as MetaCatalogBatchStatusRow).handle === undefined ||
        (row as MetaCatalogBatchStatusRow).handle === handle)
  );
  return matching && typeof matching === 'object'
    ? (matching as MetaCatalogBatchStatusRow)
    : null;
}

async function waitForOneBatch(
  handle: string,
  checkStatus: (handle: string) => Promise<unknown>,
  timeoutMs: number,
  pollIntervalMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error('A Meta não confirmou a sincronização do catálogo dentro do tempo limite.');
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const statusPromise = checkStatus(handle);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('A consulta de status do catálogo excedeu o tempo limite.')),
        remainingMs
      );
    });

    let response: unknown;
    try {
      response = await Promise.race([statusPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const row = statusRow(response, handle);
    const status = typeof row?.status === 'string' ? row.status.trim().toLowerCase() : '';
    if (!status) throw new Error('A Meta retornou um status de lote inválido.');

    const errorsTotalValue = Number(row?.errors_total_count ?? 0);
    const errorsTotal = Number.isFinite(errorsTotalValue) ? errorsTotalValue : 0;
    const errorsLength = Array.isArray(row?.errors) ? row.errors.length : 0;
    if (errorsTotal > 0 || errorsLength > 0) {
      throw new Error(`A Meta retornou ${Math.max(errorsTotal, errorsLength)} erro(s) ao sincronizar o catálogo.`);
    }
    if (status === 'finished') return;
    if (['failed', 'error', 'cancelled', 'canceled', 'expired'].includes(status)) {
      throw new Error(`A Meta informou que o lote do catálogo terminou com status “${status}”.`);
    }

    const delayMs = Math.min(pollIntervalMs, deadline - Date.now());
    if (delayMs <= 0) {
      throw new Error('A Meta não confirmou a sincronização do catálogo dentro do tempo limite.');
    }
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  }
}

/** Aguarda a conclusão de todos os handles de items_batch, falhando em erro ou timeout. */
export async function waitForMetaCatalogBatchHandles(
  handles: readonly string[],
  checkStatus: (handle: string) => Promise<unknown>,
  options: MetaCatalogBatchStatusCheckOptions = {}
): Promise<void> {
  const uniqueHandles = Array.from(new Set(handles.map((handle) => handle.trim()).filter(Boolean)));
  if (uniqueHandles.length === 0) return;

  const timeoutMs = Math.max(1, options.timeoutMs ?? 60_000);
  const pollIntervalMs = Math.max(1, options.pollIntervalMs ?? 1_000);
  await Promise.all(
    uniqueHandles.map((handle) =>
      waitForOneBatch(handle, checkStatus, timeoutMs, pollIntervalMs)
    )
  );
}
