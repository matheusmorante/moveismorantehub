const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { verifyLocalSupabase } = require('../../scripts/testing/supabase-local-preflight.cjs');
const { createRoleIdentities } = require('./helpers/local-test-identities.cjs');

const runId = `TEST_AUT_${randomUUID()}`;
const ERP_ROLES = ['administrator', 'manager', 'stockist', 'seller', 'deliverer', 'accountant', 'pending'];

async function expectDenied(promise, label) {
  const { error } = await promise;
  assert.ok(error, `${label} deveria ser negado por grant/RLS.`);
}

async function main() {
  const local = await verifyLocalSupabase();
  const fixtures = await createRoleIdentities(local, ERP_ROLES, runId);
  const stockFixtures = new Map();
  const unavailabilityIds = [];
  try {
    const settings = await fixtures.db.query("SELECT data -> 'rolePermissions' -> 'manualStockMovement' AS roles FROM public.settings WHERE id = 'app'");
    const configuredRoles = settings.rows[0]?.roles ?? null;
    const canMoveStock = role => role === 'administrator'
      || (configuredRoles === null && ['manager', 'stockist'].includes(role))
      || (Array.isArray(configuredRoles) && configuredRoles.includes(role));

    for (const identity of fixtures.identities) {
      const { client: authenticated, signOut } = await fixtures.authenticate(identity);
      try {
        const { error: selectError } = await authenticated.from('stock_unavailabilities').select('id').limit(1);
        assert.equal(selectError, null, `SELECT autenticado deveria ser permitido para ${identity.role}.`);
        await expectDenied(authenticated.from('stock_unavailabilities').insert({
          id: randomUUID(), product_id: randomUUID(), variation_id: randomUUID(), quantity: 1,
          reason: 'certification RLS', observation: runId,
        }), `INSERT direto autenticado (${identity.role})`);
        await expectDenied(authenticated.from('stock_unavailabilities').update({ observation: runId }).eq('id', randomUUID()), `UPDATE direto autenticado (${identity.role})`);
        await expectDenied(authenticated.from('stock_unavailabilities').delete().eq('id', randomUUID()), `DELETE direto autenticado (${identity.role})`);

        if (canMoveStock(identity.role)) {
          const productId = randomUUID();
          const variationId = randomUUID();
          stockFixtures.set(identity.role, { productId, variationId });
          await fixtures.db.query(
            `INSERT INTO public.products (id,name,slug,price,stock,product_kind)
             VALUES ($1,$2,$3,100,1,'normal')`,
            [productId, `${runId} ${identity.role}`, `${runId.toLowerCase()}-${identity.role}`],
          );
          await fixtures.db.query(
            'INSERT INTO public.product_variations (id,product_id,name,stock) VALUES ($1,$2,$3,1)',
            [variationId, productId, `${runId} variação`],
          );
          const { data: created, error: createError } = await authenticated.rpc('create_stock_unavailability', {
            p_product_id: productId, p_variation_id: variationId, p_quantity: 1, p_reason: `${runId} avaria`,
            p_treatment: 'Descarte/perda', p_physical_location: 'Depósito de teste', p_observation: runId,
            p_supplier_id: null, p_photos: null,
          });
          assert.equal(createError, null, `RPC de baixa deveria ser permitida para ${identity.role}: ${createError?.message}`);
          assert.ok(created?.id, `RPC deveria devolver ID para ${identity.role}.`);
          unavailabilityIds.push(created.id);
          assert.equal(created.status, 'created');
          const { data: undone, error: undoError } = await authenticated.rpc('undo_stock_unavailability', { p_unavailability_id: created.id });
          assert.equal(undoError, null, `RPC de reversão deveria ser permitida para ${identity.role}: ${undoError?.message}`);
          assert.equal(undone.status, 'cancelled');
          const finalStock = await fixtures.db.query('SELECT stock FROM public.product_variations WHERE id = $1', [variationId]);
          assert.equal(Number(finalStock.rows[0].stock), 1, `Saldo deveria ser restaurado para ${identity.role}.`);
        } else {
          const { error } = await authenticated.rpc('create_stock_unavailability', {
            p_product_id: randomUUID(), p_variation_id: randomUUID(), p_quantity: 1, p_reason: `${runId} avaria`,
            p_treatment: 'Descarte/perda', p_physical_location: 'Depósito de teste', p_observation: runId,
            p_supplier_id: null, p_photos: null,
          });
          assert.match(error?.message || '', /Sem permissão para movimentar estoque/, `RPC deveria negar perfil ${identity.role}.`);
        }
      } finally {
        await signOut();
      }
    }

    const anonymous = createClient(local.apiUrl, local.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    await expectDenied(anonymous.from('stock_unavailabilities').select('id').limit(1), 'SELECT anon em stock_unavailabilities');
    await expectDenied(anonymous.from('stock_unavailabilities').insert({
      id: randomUUID(), product_id: randomUUID(), variation_id: randomUUID(), quantity: 1,
      reason: 'certification RLS', observation: runId,
    }), 'INSERT anon em stock_unavailabilities');
    await expectDenied(anonymous.from('stock_unavailabilities').update({ observation: runId }).eq('id', randomUUID()), 'UPDATE anon em stock_unavailabilities');
    await expectDenied(anonymous.from('stock_unavailabilities').delete().eq('id', randomUUID()), 'DELETE anon em stock_unavailabilities');
    const { error: anonRpcError } = await anonymous.rpc('create_stock_unavailability', {
      p_product_id: randomUUID(), p_variation_id: randomUUID(), p_quantity: 1, p_reason: `${runId} avaria`,
      p_treatment: 'Descarte/perda', p_physical_location: 'Depósito de teste', p_observation: runId,
      p_supplier_id: null, p_photos: null,
    });
    assert.ok(anonRpcError, 'RPC de baixa deve ser negada para anon.');
    console.log(`RLS/JWT local validado por matriz de perfis ERP: ${ERP_ROLES.join(', ')}; permissões RPC comparadas à configuração efetiva manualStockMovement.`);
  } finally {
    try {
      for (const id of unavailabilityIds) {
        await fixtures.db.query('DELETE FROM public.stock_unavailabilities WHERE id = $1', [id]);
        await fixtures.db.query("DELETE FROM public.inventory_moves WHERE related_entity_id = $1::text", [id]);
      }
      for (const { variationId, productId } of stockFixtures.values()) {
        await fixtures.db.query('DELETE FROM public.product_variations WHERE id = $1', [variationId]);
        await fixtures.db.query('DELETE FROM public.products WHERE id = $1', [productId]);
      }
      const residuals = await fixtures.db.query(
        `SELECT
          (SELECT count(*) FROM public.stock_unavailabilities WHERE id = ANY($1::uuid[])) AS unavailabilities,
          (SELECT count(*) FROM public.inventory_moves WHERE related_entity_id = ANY($2::text[])) AS inventory_moves,
          (SELECT count(*) FROM public.product_variations WHERE id = ANY($3::uuid[])) AS variations,
          (SELECT count(*) FROM public.products WHERE id = ANY($4::uuid[])) AS products`,
        [unavailabilityIds, unavailabilityIds.map(String), [...stockFixtures.values()].map(item => item.variationId), [...stockFixtures.values()].map(item => item.productId)],
      );
      assert.deepEqual(Object.values(residuals.rows[0]).map(Number), [0, 0, 0, 0], 'Cleanup de fixtures de estoque deixou resíduos.');
    } finally {
      await fixtures.cleanup();
    }
  }
}

main().catch(error => {
  console.error(`Falha no teste RLS/JWT local: ${error.message}`);
  process.exitCode = 1;
});
