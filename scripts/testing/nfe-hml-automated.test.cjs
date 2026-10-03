const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { makeFixture, assertNormalSaleFixture, createSyntheticRecipient } = require('./nfe-hml-automated.cjs');
const { inspectReadiness } = require('./nfe-hml-readiness.cjs');
const { loadErpServices } = require('./nfe-hml-erp-services.cjs');

test('the test identifier does not replace the UUID PK; linked items and payment reconcile', () => {
  const orderId = randomUUID();
  const recipient = { id: randomUUID(), fullName: 'TEST_AUT CUSTOMER', cpfCnpj: '123', fullAddress: {} };
  const product = { id: randomUUID(), unitPrice: 1, name: 'TEST_AUT CRIADO-MUDO', fiscal: { ncm: '94035000' } };
  const fixture = makeFixture(orderId, recipient, product, 800123);
  assert.doesNotThrow(() => assertNormalSaleFixture(orderId, fixture));
  assert.equal(fixture.test_run_id, `TEST_AUT_${orderId}`);
  assert.equal(fixture.customerData.id, recipient.id);
  assert.equal(fixture.items[0].productId, product.id);
  assert.equal(fixture.payments[0].amount, fixture.items[0].unitPrice * fixture.items[0].quantity);
  assert.throws(() => assertNormalSaleFixture(`TEST_AUT_${orderId}`, fixture));
  assert.throws(() => assertNormalSaleFixture(orderId, { ...fixture, orderIndex: undefined }));
  assert.throws(() => assertNormalSaleFixture(orderId, { ...fixture, is_test: false }));
});

test('customer creation goes through the ERP service and returns its actual persisted ID', async () => {
  const orderId = randomUUID();
  const recipientId = randomUUID();
  let calls = 0;
  const recipient = await createSyntheticRecipient({ savePerson: async (collection, person) => {
    calls++;
    assert.equal(collection, 'customers');
    assert.equal(person.observation, `TEST_AUT_${orderId}`);
    assert.equal(person.id, undefined);
    assert.equal(person.personType, 'PF');
    assert.equal(person.fullAddress.state, 'PR');
    return { ...person, id: recipientId };
  } }, orderId);
  assert.equal(calls, 1);
  assert.equal(recipient.id, recipientId);
});

test('secret key or personal audit login never satisfy dedicated operator authentication', () => {
  const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'backend-only',
    NFE_CERTIFICATE_BASE64: 'present', NFE_CERTIFICATE_PASSWORD: 'present', NFE_RESP_TECH_CNPJ: 'present',
    NFE_RESP_TECH_CONTACT: 'present', NFE_RESP_TECH_EMAIL: 'present', NFE_RESP_TECH_PHONE: 'present',
    NFE_CSRT_HOMOLOGACAO: 'present', NFE_ID_CSRT_HOMOLOGACAO: 'present', NFE_ENVIRONMENT: '2',
    VITE_SUPABASE_ANON_KEY: 'public', VITE_AUDIT_USER: 'personal', VITE_AUDIT_PASS: 'personal' };
  assert.equal(inspectReadiness(env).failure, 'PRECHECK_OPERATOR_AUTH');
  assert.equal(inspectReadiness(env).readiness.operatorEmail, false);
  const ready = inspectReadiness({ ...env, NFE_HML_TEST_OPERATOR_EMAIL: 'dedicated', NFE_HML_TEST_OPERATOR_PASSWORD: 'secret' });
  assert.equal(ready.failure, undefined);
  assert.equal(ready.readiness.operatorPassword, true);
  assert.equal(JSON.stringify(ready.readiness).includes('secret'), false);
  assert.equal(inspectReadiness({ ...env, NFE_ENVIRONMENT: '1' }).failure, 'PRECHECK_TPAMB');
});

test('actual ERP customer service uses the injected authenticated client and mapper', async () => {
  const id = randomUUID();
  let inserted;
  const client = { from: (table) => {
    assert.equal(table, 'people');
    return { insert: (rows) => {
      inserted = rows[0];
      return { select: async () => ({ data: [{ ...inserted, id }], error: null }) };
    } };
  } };
  const services = await loadErpServices(client);
  const recipient = await createSyntheticRecipient(services, randomUUID());
  assert.equal(inserted.person_type, 'customers');
  assert.equal(inserted.person_type_pf_pj, 'PF');
  assert.equal(recipient.id, id);
  assert.equal(recipient.fullAddress.state, 'PR');
  assert.equal(services.hasFiscalOperationRole({ role: 'seller' }), true);
  assert.equal(services.hasFiscalOperationRole({ role: 'pending' }), false);
});
