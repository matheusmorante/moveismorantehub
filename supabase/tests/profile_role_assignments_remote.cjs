const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');

const EXPECTED_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const runId = process.env.PROFILE_ROLE_TEST_RUN_ID || '';
const supabaseUrl = process.env.PROFILE_ROLE_TEST_URL || '';
const anonKey = process.env.PROFILE_ROLE_TEST_ANON_KEY || '';

function requireTestIdentity(role) {
  const prefix = `PROFILE_ROLE_TEST_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`] || '';
  const password = process.env[`${prefix}_PASSWORD`] || '';

  assert.ok(email.toLowerCase().startsWith(`${runId.toLowerCase()}-`), `${role}: email fora do runId de teste`);
  assert.ok(email.toLowerCase().endsWith('@example.test'), `${role}: use somente o domínio descartável example.test`);
  assert.ok(password.length >= 18, `${role}: senha temporária ausente ou curta`);

  return { role, email, password };
}

function createUserClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(identity) {
  const client = createUserClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });
  assert.equal(error, null, `${identity.role}: autenticação de teste falhou`);
  assert.ok(data.user?.id, `${identity.role}: Auth não retornou usuário`);
  assert.equal(data.user.email?.toLowerCase(), identity.email.toLowerCase());

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id,email,role,roles,full_name')
    .eq('id', data.user.id)
    .single();
  assert.equal(profileError, null, `${identity.role}: perfil de teste ausente`);
  assert.equal(profile.email?.toLowerCase(), identity.email.toLowerCase());

  return { client, user: data.user, profile };
}

async function expectRoleWriteDenied(client, id, patch, label) {
  const { error } = await client.from('profiles').update(patch).eq('id', id).select('id');
  assert.match(error?.message || '', /Only administrators can (assign|change) roles/, label);
}

async function main() {
  assert.match(runId, /^TEST_AUT_[0-9a-f-]{36}$/i, 'runId precisa usar o formato TEST_AUT_<uuid>');
  assert.equal(new URL(supabaseUrl).origin, EXPECTED_URL, 'O teste aceita somente o projeto MoranteHub configurado.');
  assert.ok(anonKey, 'Chave publishable/anon ausente.');

  const identities = ['seller', 'manager', 'administrator'].map(requireTestIdentity);
  assert.equal(new Set(identities.map(identity => identity.email.toLowerCase())).size, identities.length);

  const signedIn = {};
  try {
    for (const identity of identities) signedIn[identity.role] = await signIn(identity);

    const seller = signedIn.seller;
    const manager = signedIn.manager;
    const administrator = signedIn.administrator;
    assert.equal(seller.profile.role, 'seller', 'Conta comum de teste deve ter perfil seller.');
    assert.ok(!seller.profile.roles?.includes('administrator'));
    assert.equal(manager.profile.role, 'manager');
    assert.ok(!manager.profile.roles?.includes('administrator'));
    assert.equal(administrator.profile.role, 'administrator');

    await expectRoleWriteDenied(
      seller.client,
      seller.user.id,
      { role: 'administrator' },
      'Usuário comum não pode alterar role.'
    );
    await expectRoleWriteDenied(
      seller.client,
      seller.user.id,
      { roles: ['administrator'] },
      'Usuário comum não pode alterar roles.'
    );

    const ordinaryEdit = await seller.client
      .from('profiles')
      .update({ full_name: `${runId} profile edit` })
      .eq('id', seller.user.id)
      .select('id,full_name')
      .single();
    assert.equal(ordinaryEdit.error, null, 'Edição normal do próprio perfil deve continuar funcionando.');
    assert.equal(ordinaryEdit.data.full_name, `${runId} profile edit`);

    await expectRoleWriteDenied(
      manager.client,
      manager.user.id,
      { role: 'administrator' },
      'Manager não pode alterar role.'
    );
    await expectRoleWriteDenied(
      manager.client,
      manager.user.id,
      { roles: ['administrator'] },
      'Manager não pode alterar roles.'
    );

    const managerCrossAccountWrite = await manager.client
      .from('profiles')
      .update({ role: 'administrator', roles: ['administrator'] })
      .eq('id', seller.user.id)
      .select('id');
    assert.equal(managerCrossAccountWrite.error, null);
    assert.deepEqual(managerCrossAccountWrite.data, [], 'Manager não pode alterar o perfil de outra conta.');

    const authorizedRoleWrite = await administrator.client
      .from('profiles')
      .update({ role: 'manager', roles: ['manager', 'accountant'] })
      .eq('id', seller.user.id)
      .select('id,role,roles')
      .single();
    assert.equal(authorizedRoleWrite.error, null, 'Administrator deve alterar role e roles.');
    assert.equal(authorizedRoleWrite.data.role, 'manager');
    assert.deepEqual(authorizedRoleWrite.data.roles, ['manager', 'accountant']);

    const adminCountQuery = await administrator.client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .or('role.eq.administrator,roles.cs.{administrator}');
    const selfDemotion = { tested: false, reason: 'Não foi possível confirmar outro administrator.' };
    if (!adminCountQuery.error && (adminCountQuery.count || 0) > 1) {
      const result = await administrator.client
        .from('profiles')
        .update({ role: 'manager', roles: ['manager'] })
        .eq('id', administrator.user.id)
        .select('id,role,roles')
        .single();
      assert.equal(result.error, null, 'Administrator pode se rebaixar quando outro administrator permanece.');
      assert.equal(result.data.role, 'manager');
      assert.deepEqual(result.data.roles, ['manager']);
      const status = await administrator.client.rpc('is_administrator');
      assert.equal(status.error, null);
      assert.equal(status.data, false);
      selfDemotion.tested = true;
      selfDemotion.otherAdministrators = adminCountQuery.count - 1;
      delete selfDemotion.reason;
    }

    console.log(JSON.stringify({
      runId,
      projectRef: 'hkoxhourxwlddgsfdgws',
      identities: Object.fromEntries(Object.entries(signedIn).map(([role, item]) => [role, item.user.id])),
      checks: {
        ordinaryRoleBlocked: true,
        ordinaryRolesBlocked: true,
        managerRoleBlocked: true,
        managerRolesBlocked: true,
        managerCrossAccountBlocked: true,
        administratorCanWriteBothFields: true,
        ordinaryProfileEditWorks: true,
        selfDemotionWhenAnotherAdminRemains: selfDemotion,
      },
      cleanup: 'not performed by this script; remove only these three TEST_AUT identities after evidence capture',
    }));
  } finally {
    await Promise.all(Object.values(signedIn).map(({ client }) => client.auth.signOut()));
  }
}

main().catch(error => {
  console.error(`Falha no teste remoto de profiles: ${error.code || error.name || 'erro desconhecido'}`);
  process.exitCode = 1;
});
