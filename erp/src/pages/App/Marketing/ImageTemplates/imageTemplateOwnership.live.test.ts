import { createClient } from '@supabase/supabase-js';
import { expect, it } from 'vitest';
import { startImageTemplate } from '../../../../../../shared-utils/catalogImageTemplate';

const enabled = process.env.MORANTE_IMAGE_TEMPLATE_DB_AUDIT === 'development-owned';

it.skipIf(!enabled)('recusa identidade de fixture inválida no banco antes do CRUD pela interface', async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  const runId = process.env.MORANTE_IMAGE_TEMPLATE_OWNED_RUN_ID;
  if (!url || !key || !password || email?.trim().toLowerCase() !== 'matheusmorante002@gmail.com'
    || new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co'
    || !runId || !/^[0-9a-f-]{36}$/.test(runId)) throw new Error('Execução, operador ou projeto não autorizado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.user) throw new Error('Não foi possível confirmar o operador.');
  const administrator = await client.rpc('is_administrator');
  expect(administrator.error).toBeNull();
  expect(administrator.data).toBe(true);
  const identity = { is_test: true, runId, ownerId: login.data.user.id, scenarioKey: 'image_template_crud' };
  const invalid = [
    { ...identity, ownerId: crypto.randomUUID() },
    { ...identity, runId: 'invalido' },
    { ...identity, scenarioKey: 'outro_cenario' },
  ];
  for (const metadata of invalid) {
    const id = crypto.randomUUID();
    const result = await client.from('catalog_image_templates').insert({ id, name: 'Validação negativa de identidade',
      description: '', design: { ...startImageTemplate('blank'), testArtifact: metadata } }).select('id').maybeSingle();
    expect(result.error?.message).toContain('TEST_ARTIFACT_UNAUTHORIZED');
    const unchanged = await client.from('catalog_image_templates').select('id').eq('id', id).maybeSingle();
    expect(unchanged.error).toBeNull();
    expect(unchanged.data).toBeNull();
  }
  const ownedId = process.env.MORANTE_IMAGE_TEMPLATE_OWNED_MODEL_ID;
  const previousVersion = process.env.MORANTE_IMAGE_TEMPLATE_PREVIOUS_VERSION;
  if (ownedId || previousVersion) {
    if (!ownedId || !/^[0-9a-f-]{36}$/.test(ownedId) || !previousVersion || !Number.isFinite(Date.parse(previousVersion))) {
      throw new Error('Modelo e versão próprios são obrigatórios nesta etapa.');
    }
    const read = () => client.from('catalog_image_templates').select('id,name,design,updated_at')
      .eq('id', ownedId).eq('design->testArtifact->>runId', runId)
      .eq('design->testArtifact->>ownerId', identity.ownerId).single();
    const before = await read();
    expect(before.error).toBeNull();
    expect(before.data?.design.testArtifact).toEqual(identity);
    expect(before.data?.updated_at).not.toBe(previousVersion);
    if (!before.data) throw new Error('Fixture própria não foi confirmada.');
    const designs = [
      { ...before.data.design, testArtifact: undefined },
      { ...before.data.design, testArtifact: { ...identity, runId: crypto.randomUUID() } },
      { ...before.data.design, testArtifact: { ...identity, ownerId: crypto.randomUUID() } },
    ];
    for (const design of designs) {
      const changed = await client.from('catalog_image_templates').update({ design })
        .eq('id', ownedId).eq('design->testArtifact->>runId', runId)
        .eq('design->testArtifact->>ownerId', identity.ownerId);
      expect(changed.error?.message).toContain('TEST_ARTIFACT_UNAUTHORIZED');
    }
    const staleUpdate = await client.from('catalog_image_templates').update({ name: 'Versão antiga não deve gravar' })
      .eq('id', ownedId).eq('updated_at', previousVersion).eq('design->testArtifact->>runId', runId).select('id');
    expect(staleUpdate.error).toBeNull();
    expect(staleUpdate.data).toEqual([]);
    const staleDelete = await client.from('catalog_image_templates').delete()
      .eq('id', ownedId).eq('updated_at', previousVersion).eq('design->testArtifact->>runId', runId).select('id');
    expect(staleDelete.error).toBeNull();
    expect(staleDelete.data).toEqual([]);
    const after = await read();
    expect(after.error).toBeNull();
    expect(after.data).toEqual(before.data);
  }
}, 45_000);
