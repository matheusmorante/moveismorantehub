import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseSecretKey } from '../supabaseSecretKey';
import { withSpan } from '../../src/telemetry/tracer';
import { createProductDbClient } from './serverDb';
import { ClassificationBudgetError, cleanText } from './classificationBudgetAndCache';
import {
  executeProductClassification,
  type ProductClassificationInput,
} from './classificationPipeline';

const SAFE_CLASSIFICATION_ERROR_REASONS = new Set([
  'timeout',
  'rate_limited',
  'openai_http',
  'openai_response',
  'ai_quota_blocked',
  'catalog_unavailable',
  'ncm_search_unavailable',
  'ncm_catalog_unavailable',
  'jev_budget_unavailable',
]);

function parseClassificationInput(
  rawBody: unknown
): { ok: true; value: ProductClassificationInput } | { ok: false; error: string } {
  const body = (rawBody || {}) as Record<string, unknown>;
  if (typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Produto inválido.' };
  }

  const source = body.source === undefined ? 'product' : body.source;
  if (source !== 'product' && source !== 'invoice') {
    return { ok: false, error: 'Origem de classificação inválida.' };
  }

  const isInvoice = source === 'invoice';
  const name = cleanText(body.name || body.title, 180);
  const title = cleanText(body.title || body.name, 180);
  const classificationTitle = isInvoice ? title : name;
  if (classificationTitle.length < 3) {
    return { ok: false, error: 'Produto inválido.' };
  }

  return {
    ok: true,
    value: {
      source,
      isInvoice,
      name,
      title,
      classificationTitle,
      description: isInvoice ? '' : cleanText(body.description, 500),
      material: isInvoice ? '' : cleanText(body.material, 100),
      categoryId: isInvoice ? '' : cleanText(body.categoryId, 80),
      categoryHint: isInvoice ? '' : cleanText(body.category, 120),
      productId: isInvoice ? '' : cleanText(body.productId, 80),
      hasNcm: !isInvoice && Boolean(cleanText(body.ncm, 20)),
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = getSupabaseSecretKey() || '';
  const openAiKey = process.env.OPENAI_API_KEY?.trim() || '';
  if (!supabaseUrl || !serviceKey || !openAiKey) {
    return res.status(503).json({ error: 'Classificação indisponível.' });
  }

  const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: 'Sessão inválida.' });

  const db = createProductDbClient(supabaseUrl, serviceKey);
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return res.status(401).json({ error: 'Sessão inválida.' });

  // search_ncms tem EXECUTE para authenticated; manter o JWT do operador nessa RPC.
  const userDb = createProductDbClient(supabaseUrl, serviceKey, token);

  const parsedInput = parseClassificationInput(req.body);
  if (!parsedInput.ok) {
    return res.status(400).json({ error: parsedInput.error });
  }

  // A resposta só classifica. Nenhum dado de produto, estoque ou fiscal é gravado aqui.
  try {
    const result = await executeProductClassification({
      db,
      userDb,
      userId: auth.user.id,
      res,
      openAiKey,
      input: parsedInput.value,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (res.headersSent) return;
    if (error instanceof ClassificationBudgetError) {
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
    const safeReason = SAFE_CLASSIFICATION_ERROR_REASONS.has(reason) ? reason : 'unknown';

    await withSpan(
      'product.ai.fallback',
      async (span) => {
        span.setAttribute('timeout', safeReason === 'timeout');
        span.setAttribute('fallback.manual', true);
      },
      { module: 'Products', reason: safeReason }
    );
    console.warn('PRODUCT_AI_CLASSIFICATION_FAILED', safeReason);
    return res.status(503).json({ error: 'Classificação indisponível.' });
  }
}
