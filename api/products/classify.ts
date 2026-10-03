import { getSupabaseSecretKey } from './supabaseSecretKey';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createProductDbClient } from './serverDb';
import { withSpan } from '../../src/telemetry/tracer';
import {
  buildNcmSearchTerms,
  isCurrentNcm,
  validateCategoryChoice,
  validateNcmChoice,
  type CategoryCandidate,
  type NcmCandidate,
} from './classificationCore';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceKey = getSupabaseSecretKey() || '';
const jevKey = process.env.TYPESAFE_API_KEY || '';
const dateInBrazil = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const cleanText = (value: unknown, limit: number) =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

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
  const title = cleanText(body.name || body.title, 180);
  const description = cleanText(body.description, 500);
  const material = cleanText(body.material, 100);
  const categoryId = cleanText(body.categoryId, 80);
  const hasNcm = Boolean(cleanText(body.ncm, 20));
  if (title.length < 3 || typeof body !== 'object' || Array.isArray(body))
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
        let categoryName = '';

        if (categoryId) {
          const { data } = await db
            .from('categories')
            .select('id,name,type')
            .eq('id', categoryId)
            .eq('type', 'category')
            .maybeSingle();
          categoryName = data?.name || '';
        } else {
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
          if (options.length > 0 && options.length <= 255) {
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

        if (!hasNcm) {
          const terms = buildNcmSearchTerms(title, categoryName, material);
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
            .slice(0, 15)
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
        if (!Object.keys(questions).length) return { category: null, ncm: null };
        const response = await fetch('https://api.typesafe.ai/v1/systemone', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jevKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: {
              title,
              description,
              material,
              ...(categoryName ? { category: categoryName } : {}),
            },
            model: 'jev-latest',
            questions,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(response.status === 429 ? 'rate_limited' : 'jev_http');
        const payload = await response.json();
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
        return {
          category: category && { id: category.id, name: category.name },
          ncm: ncm && { code: ncm.code, description: ncm.official_description },
        };
      },
      { module: 'Products', operation: 'classify' }
    );
    return res.status(200).json(result);
  } catch (error) {
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
