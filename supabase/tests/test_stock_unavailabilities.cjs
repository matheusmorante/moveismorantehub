const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');

const migrationFiles = [
  '../migrations/20260927235000_create_stock_unavailabilities.sql',
  '../migrations/20260928002920_harden_stock_unavailabilities.sql',
];
const userId = '00000000-0000-4000-8000-000000000001';
const deniedUserId = '00000000-0000-4000-8000-000000000002';
const productId = '11111111-1111-4111-8111-111111111111';
const variationId = '22222222-2222-4222-8222-222222222222';
const otherProductId = '33333333-3333-4333-8333-333333333333';
const otherVariationId = '44444444-4444-4444-8444-444444444444';

async function expectReject(operation, pattern) {
  await assert.rejects(operation, pattern);
}

async function run() {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE SCHEMA storage;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
        SELECT current_user;
      $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
        SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
      $$;
      CREATE TABLE public.profiles (
        id uuid PRIMARY KEY REFERENCES auth.users(id),
        role text NOT NULL DEFAULT 'pending',
        roles text[] NOT NULL DEFAULT ARRAY[]::text[]
      );
      CREATE TABLE public.settings (id text PRIMARY KEY, data jsonb NOT NULL DEFAULT '{}'::jsonb);
      CREATE TABLE public.products (id uuid PRIMARY KEY, stock numeric);
      CREATE TABLE public.product_variations (id uuid PRIMARY KEY, product_id uuid NOT NULL, stock numeric);
      CREATE TABLE public.people (id text PRIMARY KEY, full_name text, nickname text, social_name text);
      CREATE TABLE public.inventory_moves (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid, variation_id uuid,
        type text, quantity numeric, date timestamptz, label text, observation text,
        related_entity_id text, related_entity_type text, status text, created_at timestamptz DEFAULT now()
      );
      CREATE FUNCTION public.validate_inventory_move_identity()
      RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
      DECLARE v_product_id uuid;
      BEGIN
        IF NEW.variation_id IS NULL THEN
          RAISE EXCEPTION 'Movimentação operacional exige variation_id.';
        END IF;
        SELECT variation.product_id INTO v_product_id
        FROM public.product_variations AS variation WHERE variation.id = NEW.variation_id;
        IF v_product_id IS NULL OR NEW.product_id IS DISTINCT FROM v_product_id THEN
          RAISE EXCEPTION 'variation_id não pertence ao product_id';
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER validate_inventory_move_identity_before_write
      BEFORE INSERT OR UPDATE OF product_id, variation_id ON public.inventory_moves
      FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_move_identity();

      CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
      CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE FUNCTION storage.foldername(object_name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
        SELECT CASE WHEN strpos(object_name, '/') = 0 THEN ARRAY[]::text[] ELSE (string_to_array(object_name, '/'))[1:array_length(string_to_array(object_name, '/'), 1) - 1] END;
      $$;
      GRANT USAGE ON SCHEMA public, auth, storage TO authenticated, anon;
    `);

    for (const migrationFile of migrationFiles) {
      const sql = fs.readFileSync(path.join(__dirname, migrationFile), 'utf8');
      await db.exec(sql);
    }

    await db.query('INSERT INTO auth.users(id) VALUES ($1), ($2)', [userId, deniedUserId]);
    await db.query("INSERT INTO public.profiles(id, role, roles) VALUES ($1, 'stockist', ARRAY['stockist']), ($2, 'seller', ARRAY['seller'])", [userId, deniedUserId]);
    await db.query("INSERT INTO public.settings(id, data) VALUES ('app', '{\"rolePermissions\":{\"manualStockMovement\":[\"manager\",\"stockist\"]}}')");
    await db.query('INSERT INTO public.products(id,stock) VALUES ($1,10), ($2,10)', [productId, otherProductId]);
    await db.query('INSERT INTO public.product_variations(id,product_id,stock) VALUES ($1,$2,10), ($3,$4,10)', [variationId, productId, otherVariationId, otherProductId]);
    await db.exec(`
      GRANT SELECT ON public.profiles, public.settings, public.products, public.product_variations,
        public.people, public.stock_unavailabilities, public.inventory_moves TO authenticated;
      GRANT INSERT, SELECT, DELETE ON storage.objects TO authenticated;
    `);

    const setUser = async (id) => db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
    const asAuthenticated = async (operation) => {
      await db.exec('SET ROLE authenticated');
      try { return await operation(); } finally { await db.exec('RESET ROLE'); }
    };
    await setUser(userId);
    await asAuthenticated(() => db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('unavailabilities',$1)", [`${userId}/attached.jpg`]));

    const created = await asAuthenticated(() => db.query(
      "SELECT public.create_stock_unavailability($1,$2,2,'Defeito','Descarte/perda','Depósito','',NULL,$3::text[]) AS result",
      [productId, variationId, [`${userId}/attached.jpg`]]
    ));
    const unavailabilityId = created.rows[0].result.id;
    assert.ok(unavailabilityId);
    let state = await db.query('SELECT stock FROM public.product_variations WHERE id = $1', [variationId]);
    assert.equal(Number(state.rows[0].stock), 8);
    let movementCount = await db.query("SELECT count(*)::int AS count FROM public.inventory_moves WHERE related_entity_id = $1", [unavailabilityId]);
    assert.equal(movementCount.rows[0].count, 1);
    const attachedPhotoState = await db.query('SELECT photos FROM public.stock_unavailabilities WHERE id = $1', [unavailabilityId]);
    assert.deepEqual(attachedPhotoState.rows[0].photos, [`${userId}/attached.jpg`]);
    const privateBucket = await db.query("SELECT public FROM storage.buckets WHERE id = 'unavailabilities'");
    assert.equal(privateBucket.rows[0].public, false);

    await expectReject(
      asAuthenticated(() => db.query("SELECT public.create_stock_unavailability($1,NULL,1,'Defeito','Descarte/perda','Depósito','',NULL,NULL)", [productId])),
      /Selecione uma variação válida/
    );
    await expectReject(
      asAuthenticated(() => db.query("SELECT public.create_stock_unavailability($1,$2,1,'Defeito','Descarte/perda','Depósito','',NULL,NULL)", [productId, otherVariationId])),
      /Variação não encontrada/
    );
    await expectReject(
      asAuthenticated(() => db.query("SELECT public.create_stock_unavailability($1,$2,0,'Defeito','Descarte/perda','Depósito','',NULL,NULL)", [productId, variationId])),
      /quantidade válida/
    );
    await expectReject(
      asAuthenticated(() => db.query("SELECT public.create_stock_unavailability($1,$2,1,'Defeito','Devolução ao fornecedor','Depósito','',NULL,NULL)", [productId, variationId])),
      /Fornecedor é obrigatório/
    );

    await db.exec(`
      CREATE FUNCTION public.fail_unavailability_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha forçada depois de inserir movimento'; END $$;
      CREATE TRIGGER test_fail_unavailability_insert BEFORE INSERT ON public.stock_unavailabilities
      FOR EACH ROW EXECUTE FUNCTION public.fail_unavailability_insert();
    `);
    await expectReject(
      asAuthenticated(() => db.query("SELECT public.create_stock_unavailability($1,$2,1,'Rollback','Descarte/perda','Depósito','',NULL,NULL)", [productId, variationId])),
      /falha forçada/
    );
    await db.exec('DROP TRIGGER test_fail_unavailability_insert ON public.stock_unavailabilities; DROP FUNCTION public.fail_unavailability_insert();');
    state = await db.query('SELECT stock FROM public.product_variations WHERE id = $1', [variationId]);
    assert.equal(Number(state.rows[0].stock), 8);
    const productStockAfterRollback = await db.query('SELECT stock FROM public.products WHERE id = $1', [productId]);
    assert.equal(Number(productStockAfterRollback.rows[0].stock), 8);
    movementCount = await db.query("SELECT count(*)::int AS count FROM public.inventory_moves WHERE label = 'Indisponibilidade: Rollback'");
    assert.equal(movementCount.rows[0].count, 0);
    const rollbackRecord = await db.query("SELECT count(*)::int AS count FROM public.stock_unavailabilities WHERE reason = 'Rollback'");
    assert.equal(rollbackRecord.rows[0].count, 0);

    await asAuthenticated(async () => {
      await expectReject(db.query('INSERT INTO public.stock_unavailabilities(product_id,variation_id,quantity,reason) VALUES ($1,$2,1,$3)', [productId, variationId, 'direto']), /permission denied|row-level security/i);
      await expectReject(db.query('UPDATE public.stock_unavailabilities SET reason = $1 WHERE id = $2', ['alterado', unavailabilityId]), /permission denied|row-level security/i);
      await expectReject(db.query('DELETE FROM public.stock_unavailabilities WHERE id = $1', [unavailabilityId]), /permission denied|row-level security/i);
      await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('unavailabilities',$1)", [`${userId}/orphan.jpg`]);
      await expectReject(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('unavailabilities','someone-else/orphan.jpg')"), /row-level security/i);
      await db.query("DELETE FROM storage.objects WHERE bucket_id = 'unavailabilities' AND name = $1", [`${userId}/orphan.jpg`]);
      const protectedAttachment = await db.query("DELETE FROM storage.objects WHERE bucket_id = 'unavailabilities' AND name = $1", [`${userId}/attached.jpg`]);
      assert.equal(protectedAttachment.rowCount, 0);
    });

    await db.exec(`
      CREATE FUNCTION public.fail_unavailability_undo() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha forçada durante undo'; END $$;
      CREATE TRIGGER test_fail_unavailability_undo BEFORE UPDATE ON public.stock_unavailabilities
      FOR EACH ROW EXECUTE FUNCTION public.fail_unavailability_undo();
    `);
    await expectReject(asAuthenticated(() => db.query('SELECT public.undo_stock_unavailability($1)', [unavailabilityId])), /falha forçada durante undo/);
    await db.exec('DROP TRIGGER test_fail_unavailability_undo ON public.stock_unavailabilities; DROP FUNCTION public.fail_unavailability_undo();');
    state = await db.query('SELECT stock FROM public.product_variations WHERE id = $1', [variationId]);
    assert.equal(Number(state.rows[0].stock), 8);
    movementCount = await db.query("SELECT count(*)::int AS count FROM public.inventory_moves WHERE related_entity_id = $1", [unavailabilityId]);
    assert.equal(movementCount.rows[0].count, 1);
    const activeAfterFailedUndo = await db.query('SELECT status FROM public.stock_unavailabilities WHERE id = $1', [unavailabilityId]);
    assert.equal(activeAfterFailedUndo.rows[0].status, 'active');

    await setUser(deniedUserId);
    await expectReject(
      asAuthenticated(() => db.query("SELECT public.create_stock_unavailability($1,$2,1,'Sem permissão','Descarte/perda','Depósito','',NULL,NULL)", [productId, variationId])),
      /Sem permissão/
    );
    await setUser(userId);

    const undone = await asAuthenticated(() => db.query('SELECT public.undo_stock_unavailability($1) AS result', [unavailabilityId]));
    assert.equal(undone.rows[0].result.status, 'cancelled');
    state = await db.query('SELECT stock FROM public.product_variations WHERE id = $1', [variationId]);
    assert.equal(Number(state.rows[0].stock), 10);
    movementCount = await db.query("SELECT count(*)::int AS count FROM public.inventory_moves WHERE related_entity_id = $1", [unavailabilityId]);
    assert.equal(movementCount.rows[0].count, 2);
    const record = await db.query('SELECT status, photos FROM public.stock_unavailabilities WHERE id = $1', [unavailabilityId]);
    assert.equal(record.rows[0].status, 'cancelled');
    assert.deepEqual(record.rows[0].photos, [`${userId}/attached.jpg`]);
    assert.equal(await db.query('SELECT public.has_manual_stock_movement_permission() AS allowed').then((r) => r.rows[0].allowed), true);
    await expectReject(asAuthenticated(() => db.query('SELECT public.undo_stock_unavailability($1)', [unavailabilityId])), /já foi cancelada/);

    console.log('PGlite simulation checks passed: variation, permission, direct-write denial, rollback, create and undo.');
    console.log('Not proven by this single-session PGlite harness: live Supabase deployment/storage, RLS across real JWT sessions, and concurrent transactions.');
  } finally {
    await db.close();
  }
}

run().catch((error) => {
  console.error('Stock unavailability test failed:', error);
  process.exitCode = 1;
});
