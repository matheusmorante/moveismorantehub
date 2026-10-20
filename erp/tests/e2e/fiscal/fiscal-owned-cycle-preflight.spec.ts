import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const { loadPersistedFiscalOrder } = require('../../../../scripts/testing/fiscal-persisted-artifact.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

// Credentials stay in runtime memory; this read-only proof never records login.
test.use({ trace: 'off', video: 'off', screenshot: 'off' });

test('confirma fixture própria antes do ciclo HML pela UI', async () => {
  const orderId = process.env.FISCAL_E2E_SELECTED_ORDER_ID!;
  const runId = process.env.FISCAL_E2E_RUN_ID!;
  const scenarioKey = process.env.FISCAL_E2E_SCENARIO_KEY!;
  expect(process.env.FISCAL_E2E_MODE).toBe('hml');
  expect(process.env.FISCAL_E2E_TRANSMISSION_AUTHORIZED).not.toBe('true');
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await client.auth.signInWithPassword({
    email: process.env.NFE_HML_TEST_OPERATOR_EMAIL!,
    password: process.env.NFE_HML_TEST_OPERATOR_PASSWORD!,
  });
  expect(login.error === null && Boolean(login.data.session)).toBe(true);
  const artifact = await loadPersistedFiscalOrder(client, {
    orderId, runId, scenarioKey, expectedEmail: process.env.NFE_HML_TEST_OPERATOR_EMAIL!,
  });
  expect(artifact.id).toBe(orderId);
  // This private table is intentionally unavailable to authenticated browsers.
  // Only after the canonical owner/link checks, count this exact order in Node.
  const audit = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const results = await Promise.all([
    client.from('orders').select('id,order_data,status,delivery_method,updated_at,items').eq('id', orderId).single(),
    client.from('order_items').select('*').eq('order_id', orderId).order('id'),
    client.from('order_payments').select('*').eq('order_id', orderId).order('id'),
    client.from('inventory_moves').select('*').eq('order_id', orderId).order('id'),
    audit.from('nfe_outbound_attempts').select('id', { count: 'exact', head: true }).eq('order_id', orderId),
  ]);
  for (const result of results) expect(result.error?.code ?? null).toBe(null);
  const [orderResult, itemsResult, paymentsResult, movesResult, attemptsResult] = results;
  expect(attemptsResult.count).toBe(0);
  const order = orderResult.data as Record<string, any>;
  expect(order.order_data.testArtifact.runId).toBe(runId);
  expect(order.order_data.testArtifact.ownerId).toBe(login.data.user!.id);
  expect(order.order_data.testArtifact.scenarioKey).toBe(scenarioKey);
  expect(order.status).toBe('scheduled');
  expect(order.delivery_method).toBe('delivery');
  expect(order.order_data.shipping.deliveryAddress.state).toBe('SC');
  expect(itemsResult.data!.length).toBeGreaterThan(0);
  expect(paymentsResult.data!.length).toBeGreaterThan(0);
  expect(movesResult.data!.length).toBeGreaterThan(0);
  for (const move of movesResult.data!) {
    const identity = await client.rpc('test_artifact_row_data', { p_table: 'inventory_moves', p_row: move });
    expect(identity.error === null).toBe(true);
    expect(identity.data?.is_test).toBe(true);
    expect(identity.data?.runId).toBe(runId);
    expect(identity.data?.ownerId).toBe(login.data.user!.id);
  }
  const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const evidence = {
    checkedAt: new Date().toISOString(), projectRef: process.env.FISCAL_E2E_ALLOWED_SUPABASE_REF,
    runId, orderId, scenarioKey, canonicalGlobalSetupPassed: true,
    ownerAndLinksValidated: true, noPreviousFiscalAttempt: true,
    status: order.status, deliveryMethod: order.delivery_method,
    updatedAt: order.updated_at,
    fiscalContext: order.order_data.fiscalContext ?? null,
    itemSnapshots: (itemsResult.data! as Record<string, any>[]).map((item) => ({
      fiscalSnapshotVersion: item.item_snapshot?.fiscalSnapshotVersion,
      ncm: item.item_snapshot?.fiscal?.ncm,
      commercialUnit: item.item_snapshot?.fiscal?.commercialUnit,
      taxableUnit: item.item_snapshot?.fiscal?.taxableUnit,
    })),
    counts: { items: itemsResult.data!.length, payments: paymentsResult.data!.length, moves: movesResult.data!.length, outboundAttempts: attemptsResult.count },
    hashes: { items: hash(itemsResult.data), payments: hash(paymentsResult.data), moves: hash(movesResult.data) },
    transmission: false, writes: false, fullAuditComplete: false,
  };
  const encoded = JSON.stringify(evidence, null, 2) + '\n';
  const baselinePath = path.join(root, 'output/playwright/nfh-runtime-cycle-baseline.json');
  if (!fs.existsSync(baselinePath)) fs.writeFileSync(baselinePath, encoded, { flag: 'wx' });
  fs.writeFileSync(path.join(root, 'output/playwright/nfh-runtime-cycle-current-state.json'), encoded);
});

test('audita NCM dos itens e catálogo da fixture própria', async () => {
  test.setTimeout(30_000);
  // The global setup already verified this exact order, owner and product links.
  const orderId = process.env.FISCAL_E2E_SELECTED_ORDER_ID!;
  const audit = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const items = await audit.from('order_items')
    .select('product_id,item_snapshot').eq('order_id', orderId).order('id');
  expect(items.error?.code ?? null).toBe(null);
  const productIds = [...new Set((items.data || []).map((item) => item.product_id).filter(Boolean))];
  expect(productIds.length).toBeGreaterThan(0);
  const products = await audit.from('products').select('id,fiscal').in('id', productIds);
  expect(products.error?.code ?? null).toBe(null);
  const catalog = new Map((products.data || []).map((product) => [product.id, product.fiscal]));
  const classification = (items.data || []).map((item) => ({
    productId: item.product_id,
    snapshotVersion: item.item_snapshot?.fiscalSnapshotVersion ?? null,
    snapshotNcm: item.item_snapshot?.fiscal?.ncm ?? '',
    catalogNcm: catalog.get(item.product_id)?.ncm ?? '',
  }));
  console.log('[HML_FIXTURE_NCM]', JSON.stringify(classification));
  fs.writeFileSync(path.join(root, 'output/playwright/nfh-runtime-ncm-diagnostic.json'), JSON.stringify({
    checkedAt: new Date().toISOString(), orderId,
    projectRef: process.env.FISCAL_E2E_ALLOWED_SUPABASE_REF,
    runId: process.env.FISCAL_E2E_RUN_ID,
    ownerAndLinksValidated: true, classification, writes: false, transmission: false,
  }, null, 2) + '\n');
  for (const item of classification) {
    expect(String(item.catalogNcm).replace(/\D/g, '')).toMatch(/^\d{8}$/);
    expect(String(item.snapshotNcm).replace(/\D/g, '')).toMatch(/^\d{8}$/);
  }
});
