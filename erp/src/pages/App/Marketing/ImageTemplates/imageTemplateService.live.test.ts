import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';

const enabled = process.env.MORANTE_IMAGE_TEMPLATE_DB_AUDIT === 'development-readonly';

it.skipIf(!enabled)('consulta a biblioteca e os produtos do ERP pela sessão do operador', async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  if (!url || !key || !email || !password || new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co'
    || email.trim().toLowerCase() !== 'matheusmorante002@gmail.com') {
    throw new Error('O ambiente de leitura não corresponde ao projeto ou operador autorizado.');
  }
  const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
  const anonymous = createClient(url, key, { auth });
  const denied = await anonymous.from('catalog_image_template_list').select('id').limit(1);
  expect(denied.error).not.toBeNull();

  const client = createClient(url, key, { auth });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.user) throw new Error('A sessão do operador não foi confirmada.');
  vi.doMock('@/pages/utils/supabaseConfig', () => ({ supabase: client }));
  const { listImageTemplates } = await import('./imageTemplateService');
  const signal = AbortSignal.timeout(20_000);
  const page = await listImageTemplates(1, { column: 'created_at', ascending: false, pattern: '', from: '', through: '' }, signal);
  expect(Array.isArray(page.rows)).toBe(true);
  expect(page.rows.length).toBeLessThanOrEqual(15);
  expect(Number.isInteger(page.total)).toBe(true);
  const filtered = await listImageTemplates(1, { column: 'name', ascending: true, pattern: '^(?=.*mesa)(?=.*oferta).*',
    from: '2026-01-01', through: '2026-12-31' }, signal);
  expect(Array.isArray(filtered.rows)).toBe(true);
  const { listPreviewProducts, readPreviewProduct, mapPreviewProduct } = await import('./productPreviewService');
  const products = await listPreviewProducts(1, '', signal);
  expect(products.rows.length).toBeLessThanOrEqual(15);
  expect(products.rows.length).toBeGreaterThan(0);
  const selected = await readPreviewProduct(products.rows[0].id, signal);
  const variation = selected.variations.find((entry) => entry.active !== false) ?? selected.variations[0];
  const preview = mapPreviewProduct(selected, variation?.id);
  expect(preview.id).toBe(products.rows[0].id);
  expect(preview.fields.name).toBeTruthy();
  const term = products.rows[0].name.split(/\s+/).find((word) => word.replace(/[^\p{L}\p{N}]/gu, '').length >= 3);
  if (term) {
    const searched = await listPreviewProducts(1, term, signal);
    expect(searched.total).toBeGreaterThan(0);
  }
  console.info(JSON.stringify({ produtosNaPagina: products.rows.length, variacoes: selected.variations.length, fotoDisponivel: !!preview.images[0] }));
  const sampleProduct = process.env.MORANTE_IMAGE_TEMPLATE_AUDIT_PRODUCT_ID;
  const sampleVariation = process.env.MORANTE_IMAGE_TEMPLATE_AUDIT_VARIATION_ID;
  if (sampleProduct && sampleVariation) {
    if (![sampleProduct, sampleVariation].every((id) => /^[0-9a-f-]{36}$/i.test(id))) throw new Error('Seleção de leitura inválida.');
    const source = await readPreviewProduct(sampleProduct, signal);
    const sample = mapPreviewProduct(source, sampleVariation);
    expect(sample.images[0]).toBeTruthy();
    let response: Response;
    try { response = await fetch(sample.images[0]!, { method: 'HEAD', headers: { Origin: 'http://localhost:5173' }, signal }); }
    catch { throw new Error('Não foi possível consultar a imagem do produto do ERP.'); }
    const allowed = response.headers.get('access-control-allow-origin');
    console.info(JSON.stringify({ imagemStatus: response.status, corsDisponivel: allowed === '*' || allowed === 'http://localhost:5173' }));
    expect(response.ok).toBe(true);
    expect(['*', 'http://localhost:5173']).toContain(allowed);
  }
}, 45_000);
