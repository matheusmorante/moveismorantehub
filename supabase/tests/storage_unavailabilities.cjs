const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { verifyLocalSupabase } = require('../../scripts/testing/supabase-local-preflight.cjs');
const { createRoleIdentities } = require('./helpers/local-test-identities.cjs');

const runId = `TEST_AUT_${randomUUID()}`;
const bucket = 'unavailabilities';

async function main() {
  const local = await verifyLocalSupabase();
  const fixtures = await createRoleIdentities(local, ['administrator', 'manager', 'stockist', 'seller', 'deliverer', 'pending'], runId);
  const manager = fixtures.identities.find(user => user.role === 'administrator');
  const stockist = fixtures.identities.find(user => user.role === 'stockist');
  const seller = fixtures.identities.find(user => user.role === 'pending');
  const objects = new Set();
  try {
    const { data: bucketData, error: bucketError } = await fixtures.admin.storage.getBucket(bucket);
    assert.equal(bucketError, null, `Bucket ${bucket} deveria existir.`);
    assert.equal(bucketData.public, false, 'Bucket deve permanecer privado.');

    const managerAuth = await fixtures.authenticate(manager);
    const stockistAuth = await fixtures.authenticate(stockist);
    const sellerAuth = await fixtures.authenticate(seller);
    const anonymous = createClient(local.apiUrl, local.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const name = `${runId}/evidence.txt`;
    const managerPath = `${manager.id}/${name}`;
    const wrongFolderPath = `${seller.id}/${runId}/wrong-owner.txt`;
    const body = Buffer.from(`${runId}: evidência sintética`);

    const uploaded = await managerAuth.client.storage.from(bucket).upload(managerPath, body, { contentType: 'text/plain', upsert: false });
    assert.equal(uploaded.error, null, `Upload autenticado do próprio usuário deveria ser permitido: ${uploaded.error?.message}`);
    objects.add(managerPath);

    const ownRead = await managerAuth.client.storage.from(bucket).download(managerPath);
    assert.equal(ownRead.error, null, 'Leitura do próprio objeto deveria ser permitida.');
    assert.equal(await ownRead.data.text(), body.toString(), 'Conteúdo lido deve corresponder ao conteúdo sintético enviado.');

    const stockistForeignRead = await stockistAuth.client.storage.from(bucket).download(managerPath);
    assert.ok(stockistForeignRead.error || !stockistForeignRead.data, 'Outro perfil de estoque não deve ler evidência privada fora da própria pasta se não estiver anexada.');
    const sellerForeignRead = await sellerAuth.client.storage.from(bucket).download(managerPath);
    assert.ok(sellerForeignRead.error || !sellerForeignRead.data, 'Perfil sem permissão de estoque não deve ler a evidência.');
    const anonRead = await anonymous.storage.from(bucket).download(managerPath);
    assert.ok(anonRead.error || !anonRead.data, 'Leitura anônima deve ser negada.');

    const wrongFolderUpload = await managerAuth.client.storage.from(bucket).upload(wrongFolderPath, body, { contentType: 'text/plain', upsert: false });
    if (!wrongFolderUpload.error) objects.add(wrongFolderPath);
    assert.ok(wrongFolderUpload.error, 'Upload para pasta de outro usuário deve ser negado.');

    const foreignDelete = await stockistAuth.client.storage.from(bucket).remove([managerPath]);
    const stillExistsAfterForeignDelete = await fixtures.admin.storage.from(bucket).download(managerPath);
    assert.ok(foreignDelete.error || stillExistsAfterForeignDelete.data, 'Remoção por outro usuário não pode excluir o objeto do proprietário.');
    assert.ok(stillExistsAfterForeignDelete.data, 'Objeto deve continuar presente após tentativa de remoção indevida.');

    const deniedUpload = await sellerAuth.client.storage.from(bucket).upload(`${seller.id}/${runId}/denied.txt`, body, { contentType: 'text/plain', upsert: false });
    if (!deniedUpload.error) objects.add(`${seller.id}/${runId}/denied.txt`);
    assert.ok(deniedUpload.error, 'Upload por perfil sem permissão de estoque deve ser negado.');

    const ownerDelete = await managerAuth.client.storage.from(bucket).remove([managerPath]);
    assert.equal(ownerDelete.error, null, 'Remoção do próprio objeto não anexado deve ser permitida.');
    const deleted = await fixtures.admin.storage.from(bucket).download(managerPath);
    assert.ok(deleted.error || !deleted.data, 'Objeto removido não deve continuar legível.');
    objects.delete(managerPath);

    console.log('Storage/JWT local: bucket privado; upload/leitura/remoção do próprio objeto permitidos; pasta incorreta, usuário alheio, perfil sem permissão e anon negados.');
  } finally {
    try {
      if (objects.size) {
        const { error } = await fixtures.admin.storage.from(bucket).remove([...objects]);
        if (error) throw new Error('Não foi possível limpar objeto de teste próprio.');
        for (const name of objects) {
          const remaining = await fixtures.admin.storage.from(bucket).download(name);
          if (remaining.data) throw new Error(`Objeto do test run permaneceu no Storage: ${name}`);
        }
      }
    } finally {
      await fixtures.cleanup();
    }
  }
}

main().catch(error => {
  console.error(`Falha no teste Storage/JWT local: ${error.message}`);
  process.exitCode = 1;
});
