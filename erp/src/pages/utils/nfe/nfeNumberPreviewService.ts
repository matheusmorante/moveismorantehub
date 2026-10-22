import { supabase } from '../supabaseConfig';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export const FISCAL_NUMBER_PREVIEW_TTL_MS = 30_000;
export const FISCAL_NUMBER_PREVIEW_TIMEOUT_MS = 10_000;
const fiscalNumberPreviewCache = new Map<string, { nextNumber: number; timestamp: number }>();
const fiscalNumberPreviewRequests = new Map<string, Promise<number>>();

function cacheFiscalNumberPreview(cacheKey: string, nextNumber: number): void {
  const cached = fiscalNumberPreviewCache.get(cacheKey);
  if (cached && nextNumber < cached.nextNumber) return;
  fiscalNumberPreviewCache.set(cacheKey, { nextNumber, timestamp: Date.now() });
}

export function updateFiscalNumberPreviewCache(
  model: '55' | '65',
  environment: 1 | 2,
  series: string,
  nextNumber: number
): void {
  const cacheKey = `${environment}:${model}:${series}`;
  cacheFiscalNumberPreview(cacheKey, nextNumber);
}

export function getCachedFiscalNumberPreview(
  model: '55' | '65',
  environment: 1 | 2,
  series: string
): number | null {
  const cacheKey = `${environment}:${model}:${series}`;
  const cached = fiscalNumberPreviewCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FISCAL_NUMBER_PREVIEW_TTL_MS) {
    return cached.nextNumber;
  }
  return null;
}

/**
 * Consulta a prévia somente-leitura da sequência de numeração fiscal.
 * O endpoint de emissão é o único responsável por reservar atomicamente o número definitivo.
 */
export async function getNextNfeNumberPreview(
  model: '55' | '65',
  environment: 1 | 2,
  series: string,
  minimumNumber: number
): Promise<number> {
  const cacheKey = `${environment}:${model}:${series}`;
  const cached = fiscalNumberPreviewCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FISCAL_NUMBER_PREVIEW_TTL_MS) {
    return cached.nextNumber;
  }

  const requestKey = `${cacheKey}:${minimumNumber}`;
  const existingRequest = fiscalNumberPreviewRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const sessionResult = await withTimeout(
      supabase.auth.getSession(),
      FISCAL_NUMBER_PREVIEW_TIMEOUT_MS,
      null,
      'nfe:numero-preview-sessao'
    );
    if (!sessionResult)
      throw new Error('A consulta da sessão fiscal excedeu o tempo limite.');
    const { data, error } = sessionResult;
    if (error || !data.session?.access_token)
      throw new Error('Faça login novamente para consultar a numeração fiscal.');
    const query = new URLSearchParams({
      model,
      environment: String(environment),
      series,
      minimumNumber: String(minimumNumber),
    });
    const controller = new AbortController();
    const response = await withTimeout(
      fetch(`/api/nfe/reserve-number?${query}`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: 'no-store',
        signal: controller.signal,
      }),
      FISCAL_NUMBER_PREVIEW_TIMEOUT_MS,
      null,
      'nfe:numero-preview-api'
    );
    if (!response) {
      controller.abort();
      throw new Error('A consulta do próximo número fiscal excedeu o tempo limite.');
    }
    const result = await withTimeout(
      response.json().catch(() => ({})),
      FISCAL_NUMBER_PREVIEW_TIMEOUT_MS,
      null,
      'nfe:numero-preview-resposta'
    );
    if (!result) {
      controller.abort();
      throw new Error('A resposta da sequência fiscal excedeu o tempo limite.');
    }
    if (!response.ok || !Number.isInteger(result.nextNumber))
      throw new Error(result.error || 'Não foi possível consultar a numeração fiscal.');

    cacheFiscalNumberPreview(cacheKey, result.nextNumber);
    return result.nextNumber;
  })();
  fiscalNumberPreviewRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    if (fiscalNumberPreviewRequests.get(requestKey) === request) {
      fiscalNumberPreviewRequests.delete(requestKey);
    }
  }
}
