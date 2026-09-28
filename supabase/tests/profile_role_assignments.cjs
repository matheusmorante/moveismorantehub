const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { verifyLocalSupabase } = require('../../scripts/testing/supabase-local-preflight.cjs');
const { createRoleIdentities } = require('./helpers/local-test-identities.cjs');

const runId = `TEST_PROFILE_ROLE_${randomUUID()}`;

async function main() {
  const local = await verifyLocalSupabase();
  const fixtures = await createRoleIdentities(local, ['administrator', 'manager', 'seller'], runId);
  const administrator = fixtures.identities.find(identity => identity.role === 'administrator');
  const manager = fixtures.identities.find(identity => identity.role === 'manager');
  const seller = fixtures.identities.find(identity => identity.role === 'seller');

  try {
    const { client: sellerClient, signOut: signOutSeller } = await fixtures.authenticate(seller);
    try {
      const scalarRoleChange = await sellerClient
        .from('profiles')
        .update({ role: 'administrator' })
        .eq('id', seller.id)
        .select('id');
      assert.match(
        scalarRoleChange.error?.message || '',
        /Only administrators can change roles/,
        'Usuário comum não pode promover o campo role.'
      );

      const rolesChange = await sellerClient
        .from('profiles')
        .update({ roles: ['administrator'] })
        .eq('id', seller.id)
        .select('id');
      assert.match(
        rolesChange.error?.message || '',
        /Only administrators can change roles/,
        'Usuário comum não pode se promover pelo campo roles.'
      );

      const roleInsert = await sellerClient.from('profiles').insert({
        id: seller.id,
        email: seller.email,
        role: 'pending',
        roles: ['administrator'],
      });
      assert.match(
        roleInsert.error?.message || '',
        /Only administrators can assign roles/,
        'Usuário comum não pode inserir perfil com papel privilegiado.'
      );

      const ownProfile = await sellerClient
        .from('profiles')
        .select('id,role,roles')
        .eq('id', seller.id)
        .single();
      assert.equal(ownProfile.error, null);
      assert.equal(ownProfile.data.role, 'seller');
      assert.deepEqual(ownProfile.data.roles, ['seller']);

      const normalProfileEdit = await sellerClient
        .from('profiles')
        .update({ full_name: `${runId} profile edit` })
        .eq('id', seller.id)
        .select('id,full_name')
        .single();
      assert.equal(normalProfileEdit.error, null, normalProfileEdit.error?.message);
      assert.equal(normalProfileEdit.data.full_name, `${runId} profile edit`);
    } finally {
      await signOutSeller();
    }

    const { client: managerClient, signOut: signOutManager } = await fixtures.authenticate(manager);
    try {
      const managerSelfPromotion = await managerClient
        .from('profiles')
        .update({ role: 'administrator' })
        .eq('id', manager.id)
        .select('id');
      assert.match(
        managerSelfPromotion.error?.message || '',
        /Only administrators can change roles/,
        'Manager não pode se promover pelo campo role.'
      );

      const managerSelfRolesPromotion = await managerClient
        .from('profiles')
        .update({ roles: ['administrator'] })
        .eq('id', manager.id)
        .select('id');
      assert.match(
        managerSelfRolesPromotion.error?.message || '',
        /Only administrators can change roles/,
        'Manager não pode se promover pelo campo roles.'
      );

      const managerChange = await managerClient
        .from('profiles')
        .update({ role: 'administrator', roles: ['administrator'] })
        .eq('id', seller.id)
        .select('id');
      assert.equal(managerChange.error, null);
      assert.deepEqual(managerChange.data, [], 'Manager não pode alterar papel de outra conta.');
    } finally {
      await signOutManager();
    }

    const { client: administratorClient, signOut: signOutAdministrator } =
      await fixtures.authenticate(administrator);
    try {
      const authorizedChange = await administratorClient
        .from('profiles')
        .update({ role: 'manager', roles: ['manager', 'accountant'] })
        .eq('id', seller.id)
        .select('id,role,roles')
        .single();
      assert.equal(authorizedChange.error, null, authorizedChange.error?.message);
      assert.equal(authorizedChange.data.role, 'manager');
      assert.deepEqual(authorizedChange.data.roles, ['manager', 'accountant']);

      const secondaryAdministratorRole = await administratorClient
        .from('profiles')
        .update({ roles: ['manager', 'administrator'] })
        .eq('id', manager.id)
        .select('id,role,roles')
        .single();
      assert.equal(secondaryAdministratorRole.error, null, secondaryAdministratorRole.error?.message);
      assert.equal(secondaryAdministratorRole.data.role, 'manager');
      assert.deepEqual(secondaryAdministratorRole.data.roles, ['manager', 'administrator']);

      const administratorSelfDemotion = await administratorClient
        .from('profiles')
        .update({ role: 'manager', roles: ['manager'] })
        .eq('id', administrator.id)
        .select('id,role,roles')
        .single();
      assert.equal(administratorSelfDemotion.error, null, administratorSelfDemotion.error?.message);
      assert.equal(administratorSelfDemotion.data.role, 'manager');
      assert.deepEqual(administratorSelfDemotion.data.roles, ['manager']);
    } finally {
      await signOutAdministrator();
    }

    const { client: managerWithAdministratorRole, signOut: signOutElevatedManager } =
      await fixtures.authenticate(manager);
    try {
      const lastAdministratorDemotion = await managerWithAdministratorRole
        .from('profiles')
        .update({ role: 'manager', roles: ['manager'] })
        .eq('id', manager.id)
        .select('id');
      assert.match(
        lastAdministratorDemotion.error?.message || '',
        /At least one administrator must remain assigned/,
        'O último administrator não pode remover o próprio acesso.'
      );

      const lastAdministratorDeletion = await managerWithAdministratorRole
        .from('profiles')
        .delete()
        .eq('id', manager.id)
        .select('id');
      assert.match(
        lastAdministratorDeletion.error?.message || '',
        /At least one administrator must remain assigned/,
        'O último administrator não pode excluir o próprio perfil.'
      );

      const { data: isAdministrator, error } = await managerWithAdministratorRole.rpc('is_administrator');
      assert.equal(error, null, error?.message);
      assert.equal(isAdministrator, true, 'A role secundária administrator deve ser reconhecida.');
    } finally {
      await signOutElevatedManager();
    }

    console.log('Proteção local de profiles.role/roles validada: autoelevação negada, manager negado e administrator autorizado.');
  } finally {
    await fixtures.cleanup();
  }
}

main().catch(error => {
  console.error(`Falha no teste local de roles de profiles: ${error.message}`);
  process.exitCode = 1;
});
