import { createHash, randomUUID } from 'node:crypto';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createProductDbClient } from './serverDb';
import { withSpan } from '../../src/telemetry/tracer';
import {
  buildNcmSearchTerms,
  isCurrentNcm,
  isWoodenBedroomFurnitureByName,
  WOODEN_BEDROOM_FURNITURE_NCM,
  validateCategoryChoice,
  validateNcmChoice,
  type CategoryCandidate,
  type NcmCandidate,
} from './classificationCore';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceKey = getSupabaseSecretKey() || '';
const jevKey = process.env.TYPESAFE_API_KEY || '';
const JEV_INPUT_TOKEN_LIMIT_PER_MINUTE = 2_000;
const dateInBrazil = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const cleanText = (value: unknown, limit: number) =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

type JevClassificationResult = {
  category: { id: string; name: string } | null;
  ncm: { code: string; description: string } | null;
};

type JevReservation = {
  allowed: boolean;
  reason: string;
  used_input_tokens: number;
  retry_after_seconds: number;
  cached_response: unknown;
};

class JevInputBudgetError extends Error {
  constructor(
    readonly statusCode: 413 | 429,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
  }
}

function estimateJevInputTokens(serializedRequest: string): number {
  // Reserva com margem antes do envio; o uso reportado pelo provedor substitui a estimativa depois.
  return Math.ceil(Buffer.byteLength(serializedRequest, 'utf8') / 2) + 512;
}

async function reserveJevInputBudget(
  db: ReturnType<typeof createProductDbClient>,
  requestId: string,
  fingerprint: string,
  reservedTokens: number,
  ignoreCache: boolean
): Promise<JevReservation> {
  const { data, error } = await db.rpc('reserve_jev_classification_tokens', {
    p_request_id: requestId,
    p_request_fingerprint: fingerprint,
    p_reserved_input_tokens: reservedTokens,
    p_ignore_cache: ignoreCache,
  });
  if (error) throw new Error('jev_budget_unavailable');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error('jev_budget_unavailable');
  return row as JevReservation;
}

function throwForBudgetDecision(decision: JevReservation): void {
  if (decision.reason === 'request_too_large')
    throw new JevInputBudgetError(413, 'request_too_large', 'Dados demais para classificar em uma única chamada.');
  if (decision.reason === 'token_limit' || decision.reason === 'in_progress')
    throw new JevInputBudgetError(
      429,
      decision.reason,
      'Limite de uso do classificador atingido. Tente novamente após alguns segundos.',
      Math.max(1, Math.min(60, Number(decision.retry_after_seconds) || 1))
    );
  if (!decision.allowed || decision.reason !== 'reserved')
    throw new Error('jev_budget_unavailable');
}

async function validateCachedClassification(
  db: ReturnType<typeof createProductDbClient>,
  cached: unknown
): Promise<JevClassificationResult | null> {
  if (!cached || typeof cached !== 'object' || Array.isArray(cached)) return null;
  const record = cached as Record<string, unknown>;
  let category: JevClassificationResult['category'] = null;
  let ncm: JevClassificationResult['ncm'] = null;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!supabaseUrl || !serviceKey || !jevKey)
    return res.status(503).json({ error: 'Classificação indisponível.' });
  const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: 'Sessão inválida.' });
  const db = createProductDbClient(supabaseUrl, serviceKey);
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return res.status(401).json({ error: 'Sessão inválida.' });
  // search_ncms tem EXECUTE para authenticated; manter o JWT do operador nessa RPC.
  const userDb = createProductDbClient(supabaseUrl, serviceKey, token);

  const body = req.body || {};
  if (typeof body !== 'object' || Array.isArray(body))
    return res.status(400).json({ error: 'Produto inválido.' });
  const source = body.source === undefined ? 'product' : body.source;
  if (source !== 'product' && source !== 'invoice')
    return res.status(400).json({ error: 'Origem de classificação inválida.' });
  const isInvoice = source === 'invoice';
  const name = cleanText(body.name || body.title, 180);
  const title = cleanText(body.title || body.name, 180);
  const classificationTitle = isInvoice ? title : name;
  const description = isInvoice ? '' : cleanText(body.description, 500);
  const material = isInvoice ? '' : cleanText(body.material, 100);
  let categoryId = isInvoice ? '' : cleanText(body.categoryId, 80);
  const categoryHint = isInvoice ? '' : cleanText(body.category, 120);
  const productId = isInvoice ? '' : cleanText(body.productId, 80);
  const hasNcm = !isInvoice && Boolean(cleanText(body.ncm, 20));
  if (classificationTitle.length < 3)
    return res.status(400).json({ error: 'Produto inválido.' });
  // A resposta só classifica. Nenhum dado de produto, estoque ou fiscal é gravado aqui.
  try {
    const result = await withSpan(
      'product.jev.classify',
      async (span) => {
        let category: CategoryCandidate | null = null;
        let ncm: NcmCandidate | null = null;
        const questions: Record<string, unknown> = {};
        const categoryOptions = new Map<string, CategoryCandidate>();
        const ncmOptions = new Map<string, NcmCandidate>();
        let categoryName = isInvoice ? '' : categoryHint;

        if (!hasNcm && isWoodenBedroomFurnitureByName(classificationTitle, material)) {
          const { data: bedroomFurnitureNcm } = await db
            .from('ncms')
            .select('code,official_description,active,is_active,start_date,end_date')
            .eq('code', WOODEN_BEDROOM_FURNITURE_NCM)
            .maybeSingle();
          if (bedroomFurnitureNcm && isCurrentNcm(bedroomFurnitureNcm, dateInBrazil()))
            ncm = bedroomFurnitureNcm;
        }

        if (!isInvoice && !categoryId && productId) {
          const { data: product, error: productError } = await userDb
            .from('products')
            .select('category_id')
            .eq('id', productId)
            .maybeSingle();
          if (!productError) categoryId = cleanText(product?.category_id, 80);
          span.setAttribute('product.category_available', Boolean(categoryId));
        }

        if (!isInvoice && categoryId) {
          const { data } = await db
            .from('categories')
            .select('id,name,type')
            .eq('id', categoryId)
            .eq('type', 'category')
            .maybeSingle();
          categoryName = data?.name || categoryHint;
        } else if (!isInvoice) {
          const [
            { data: categories, error: categoryError },
            { data: relations, error: relationError },
          ] = await Promise.all([
            db
              .from('categories')
              .select('id,name,type')
              .eq('type', 'category')
              .order('name')
              .limit(256),
            db.from('category_relationships').select('child_id').limit(5000),
          ]);
          if (categoryError || relationError) throw new Error('catalog_unavailable');
          const linked = new Set((relations || []).map((row) => row.child_id));
          const options = (categories || []).filter((row) => linked.has(row.id));
          // Não despeja centenas de categorias no prompt; acima disso, mantém a categoria manual.
          if (options.length > 0 && options.length <= 16) {
            const criteria: Record<string, string> = {};
            options.forEach((row, index) => {
              const key = `c${index}`;
              const candidate = { id: row.id, name: row.name, active: true, selectable: true };
              criteria[key] = row.name;
              categoryOptions.set(key, candidate);
            });
            questions.category = {
              type: 'choice',
              instructions: 'Escolha a categoria de produto mais adequada entre as opções.',
              criteria,
            };
          }
        }

        if (!hasNcm && !ncm) {
          const searchTitle = isInvoice ? title : [name, title].filter(Boolean).join(' ');
          const terms = buildNcmSearchTerms(
            searchTitle,
            isInvoice ? '' : categoryName,
            isInvoice ? '' : material,
            isInvoice ? '' : description
          );
          const searches = await Promise.all(
            terms.map((term) => userDb.rpc('search_ncms', { search_term: term, max_results: 10 }))
          );
          if (searches.some((search) => search.error)) throw new Error('ncm_search_unavailable');
          const ranked = new Map<string, { code: string; rank: number }>();
          for (const search of searches)
            for (const row of search.data || []) {
              if (!ranked.has(row.code) || ranked.get(row.code)!.rank < row.rank)
                ranked.set(row.code, row);
            }
          const codes = [...ranked.values()]
            .sort((a, b) => b.rank - a.rank)
            .slice(0, 8)
            .map((row) => row.code);
          if (codes.length) {
            const { data: catalog, error: catalogError } = await db
              .from('ncms')
              .select('code,official_description,active,is_active,start_date,end_date')
              .in('code', codes);
            if (catalogError) throw new Error('ncm_catalog_unavailable');
            const today = dateInBrazil();
            const valid = (catalog || []).filter((row) => isCurrentNcm(row, today));
            const criteria: Record<string, string> = {};
            valid.forEach((row, index) => {
              const key = `n${index}`;
              criteria[key] = `${row.code} — ${row.official_description}`;
              ncmOptions.set(key, row);
            });
            if (valid.length)
              questions.ncm = {
                type: 'choice',
                instructions:
                  'Escolha somente o NCM candidato mais plausível. Esta é uma sugestão que exige revisão humana.',
                criteria,
              };
          }
        }
        if (!Object.keys(questions).length)
          return {
            category: null,
            ncm: null,
          };
        const jevRequest = {
          state: isInvoice
            ? { title }
            : {
                name,
                title,
                description,
                material,
                ...(categoryName ? { category: categoryName } : {}),
              },
          model: 'jev-latest',
          questions,
        };
        const serializedRequest = JSON.stringify(jevRequest);
        const estimatedInputTokens = estimateJevInputTokens(serializedRequest);
        if (estimatedInputTokens > JEV_INPUT_TOKEN_LIMIT_PER_MINUTE)
          throw new JevInputBudgetError(
            413,
            'request_too_large',
            'Dados demais para classificar em uma única chamada.'
          );
        const fingerprint = createHash('sha256')
          .update(
            JSON.stringify({
              userId: auth.user.id,
              source,
              state: jevRequest.state,
              hasNcm,
              questions,
            })
          )
          .digest('hex');
        const requestId = randomUUID();
        let reservation = await reserveJevInputBudget(
          db,
          requestId,
          fingerprint,
          estimatedInputTokens,
          false
        );
        if (reservation.allowed && reservation.reason === 'cached') {
          const cached = await validateCachedClassification(db, reservation.cached_response);
          if (cached) return cached;
          // O catálogo mudou desde o cache; reserve a nova chamada sem reaproveitar a resposta.
          reservation = await reserveJevInputBudget(
            db,
            requestId,
            fingerprint,
            estimatedInputTokens,
            true
          );
        }
        throwForBudgetDecision(reservation);
        span.setAttribute('jev.input_tokens.estimated', estimatedInputTokens);
        span.setAttribute('jev.input_tokens.limit_per_minute', JEV_INPUT_TOKEN_LIMIT_PER_MINUTE);
        let response: Response;
        try {
          response = await fetch('https://api.typesafe.ai/v1/systemone', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jevKey}`, 'Content-Type': 'application/json' },
          body: serializedRequest,
          signal: AbortSignal.timeout(8000),
        });
        } catch (error) {
          if (ncm) return { category: null, ncm: { code: ncm.code, description: ncm.official_description } };
          throw error;
        }
        if (!response.ok) {
          if (ncm) return { category: null, ncm: { code: ncm.code, description: ncm.official_description } };
          throw new Error(response.status === 429 ? 'rate_limited' : 'jev_http');
        }
        const payload = await response.json();
        const reportedInputTokens = Number(
          payload?.usage?.input_tokens ?? payload?.usage?.inputTokens ?? payload?.meta?.usage?.input_tokens
        );
        const answers = payload?.answers || {};
        const today = dateInBrazil();
        if (questions.category) {
          const choice = answers.category?.choice;
          const offered = categoryOptions.get(choice);
          span.setAttribute('category.choice_in_options', Boolean(offered));
          if (offered) {
            const [{ data: latest }, { data: relation }] = await Promise.all([
              db
                .from('categories')
                .select('id,name,type')
                .eq('id', offered.id)
                .eq('type', 'category')
                .maybeSingle(),
              db
                .from('category_relationships')
                .select('child_id')
                .eq('child_id', offered.id)
                .limit(1),
            ]);
            const current = new Map<string, CategoryCandidate>();
            if (latest)
              current.set(latest.id, {
                id: latest.id,
                name: latest.name,
                active: true,
                selectable: Boolean(relation?.length),
              });
            const id = validateCategoryChoice(choice, categoryOptions, current);
            if (id) category = current.get(id)!;
          }
        }
        if (questions.ncm) {
          const choice = answers.ncm?.choice;
          const offered = ncmOptions.get(choice);
          span.setAttribute('ncm.choice_in_options', Boolean(offered));
          if (offered) {
            const { data: latest } = await db
              .from('ncms')
              .select('code,official_description,active,is_active,start_date,end_date')
              .eq('code', offered.code)
              .maybeSingle();
            const current = new Map<string, NcmCandidate>();
            if (latest) current.set(latest.code, latest);
            ncm = validateNcmChoice(choice, ncmOptions, current, today);
          }
        }
        span.setAttribute('category.validated', Boolean(category));
        span.setAttribute('ncm.validated', Boolean(ncm));
        const classified: JevClassificationResult = {
          category: category && { id: category.id, name: category.name },
          ncm: ncm && { code: ncm.code, description: ncm.official_description },
        };
        const actualInputTokens =
          Number.isInteger(reportedInputTokens) && reportedInputTokens >= 0
            ? reportedInputTokens
            : estimatedInputTokens;
        const { error: settlementError } = await db.rpc('settle_jev_classification_tokens', {
          p_request_id: requestId,
          p_actual_input_tokens: actualInputTokens,
          p_response: classified,
        });
        span.setAttribute('jev.input_tokens.actual', actualInputTokens);
        if (settlementError) console.warn('JEV_USAGE_SETTLEMENT_FAILED');
        return classified;
      },
      { module: 'Products', operation: 'classify' }
    );
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof JevInputBudgetError) {
      if (error.retryAfterSeconds) res.setHeader('Retry-After', String(error.retryAfterSeconds));
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
      });
    }
    const reason =
      error && typeof error === 'object' && 'name' in error && error.name === 'TimeoutError'
        ? 'timeout'
        : error instanceof Error
          ? error.message
          : 'unknown';
    const safeReason = [
      'timeout',
      'rate_limited',
      'jev_http',
      'catalog_unavailable',
      'ncm_search_unavailable',
      'ncm_catalog_unavailable',
      'jev_budget_unavailable',
    ].includes(reason)
      ? reason
      : 'unknown';
    await withSpan(
      'product.jev.fallback',
      async (span) => {
        span.setAttribute('timeout', safeReason === 'timeout');
        span.setAttribute('fallback.manual', true);
      },
      { module: 'Products', reason: safeReason }
    );
    console.warn('PRODUCT_JEV_CLASSIFICATION_FAILED', safeReason);
    return res.status(503).json({ error: 'Classificação indisponível.' });
  }
}
