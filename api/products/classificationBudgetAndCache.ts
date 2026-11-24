import { createProductDbClient } from './serverDb';
import { isCurrentNcm } from './classificationCore';

export const CLASSIFICATION_MODEL = 'gpt-6-luna';
export const CLASSIFICATION_INPUT_TOKEN_LIMIT_PER_MINUTE = 2_000;

export const dateInBrazil = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export const cleanText = (value: unknown, limit: number): string =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

export type ClassificationResult = {
  category: { id: string; name: string } | null;
  ncm: { code: string; description: string } | null;
};

export type ClassificationReservation = {
  allowed: boolean;
  reason: string;
  used_input_tokens: number;
  retry_after_seconds: number;
  cached_response: unknown;
};

export class ClassificationBudgetError extends Error {
  constructor(
    readonly statusCode: 413 | 429,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
  }
}

export function estimateClassificationInputTokens(serializedRequest: string): number {
  // Reserva com margem antes do envio; o uso reportado pelo provedor substitui a estimativa depois.
  return Math.ceil(Buffer.byteLength(serializedRequest, 'utf8') / 2) + 512;
}

export async function reserveClassificationInputBudget(
  db: ReturnType<typeof createProductDbClient>,
  requestId: string,
  fingerprint: string,
  reservedTokens: number,
  ignoreCache: boolean
): Promise<ClassificationReservation> {
  const { data, error } = await db.rpc('reserve_jev_classification_tokens', {
    p_request_id: requestId,
    p_request_fingerprint: fingerprint,
    p_reserved_input_tokens: reservedTokens,
    p_ignore_cache: ignoreCache,
  });
  if (error) throw new Error('jev_budget_unavailable');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error('jev_budget_unavailable');
  return row as ClassificationReservation;
}

export function throwForBudgetDecision(decision: ClassificationReservation): void {
  if (decision.reason === 'request_too_large') {
    throw new ClassificationBudgetError(
      413,
      'request_too_large',
      'Dados demais para classificar em uma única chamada.'
    );
  }
  if (decision.reason === 'token_limit' || decision.reason === 'in_progress') {
    throw new ClassificationBudgetError(
      429,
      decision.reason,
      'Limite de uso do classificador atingido. Tente novamente após alguns segundos.',
      Math.max(1, Math.min(60, Number(decision.retry_after_seconds) || 1))
    );
  }
  if (!decision.allowed || decision.reason !== 'reserved') {
    throw new Error('jev_budget_unavailable');
  }
}

export async function validateCachedClassification(
  db: ReturnType<typeof createProductDbClient>,
  cached: unknown
): Promise<ClassificationResult | null> {
  if (!cached || typeof cached !== 'object' || Array.isArray(cached)) return null;
  const record = cached as Record<string, unknown>;
  let category: ClassificationResult['category'] = null;
  let ncm: ClassificationResult['ncm'] = null;

  if (record.category != null) {
    if (typeof record.category !== 'object' || Array.isArray(record.category)) return null;
    const categoryValue = record.category as Record<string, unknown>;
    const id = cleanText(categoryValue.id, 80);
    if (!id) return null;
    const [{ data: latest, error: categoryError }, { data: relation, error: relationError }] =
      await Promise.all([
        db.from('categories').select('id,name,type').eq('id', id).eq('type', 'category').maybeSingle(),
        db.from('category_relationships').select('child_id').eq('child_id', id).limit(1),
      ]);
    if (categoryError || relationError) throw new Error('catalog_unavailable');
    if (!latest || !relation?.length) return null;
    category = { id: latest.id, name: latest.name };
  }

  if (record.ncm != null) {
    if (typeof record.ncm !== 'object' || Array.isArray(record.ncm)) return null;
    const ncmValue = record.ncm as Record<string, unknown>;
    const code = cleanText(ncmValue.code, 20).replace(/\D/g, '');
    if (!/^\d{8}$/.test(code)) return null;
    const { data: latest, error } = await db
      .from('ncms')
      .select('code,official_description,active,is_active,start_date,end_date')
      .eq('code', code)
      .maybeSingle();
    if (error) throw new Error('ncm_catalog_unavailable');
    if (!latest || !isCurrentNcm(latest, dateInBrazil())) return null;
    ncm = { code: latest.code, description: latest.official_description };
  }

  return { category, ncm };
}

export async function settleClassificationTokens(
  db: ReturnType<typeof createProductDbClient>,
  requestId: string,
  actualInputTokens: number,
  classified: ClassificationResult
): Promise<void> {
  const { error } = await db.rpc('settle_jev_classification_tokens', {
    p_request_id: requestId,
    p_actual_input_tokens: actualInputTokens,
    p_response: classified,
  });
  if (error) console.warn('CLASSIFICATION_USAGE_SETTLEMENT_FAILED');
}
