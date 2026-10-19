const assert = require('node:assert/strict');
const test = require('node:test');
const { server, start } = require('../local-fiscal-dev-server.cjs');

test('fallback resolve o operador de teste sem contornar sua autorização', async (t) => {
  const previousSource = process.env.MORANTE_ENV_SOURCE;
  const previousEnvironment = process.env.VERCEL_ENV;
  process.env.MORANTE_ENV_SOURCE = 'vercel-development';
  process.env.VERCEL_ENV = 'development';
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    if (previousSource === undefined) delete process.env.MORANTE_ENV_SOURCE;
    else process.env.MORANTE_ENV_SOURCE = previousSource;
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousEnvironment;
  });
  await start(0);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const operatorUrl = `${origin}/api/testing/test-artifact-operator`;
  assert.equal((await fetch(operatorUrl)).status, 405);
  assert.equal((await fetch(operatorUrl, { method: 'POST' })).status, 401);
  process.env.VERCEL_ENV = 'production';
  assert.equal((await fetch(operatorUrl, { method: 'POST' })).status, 403);
  assert.equal((await fetch(`${origin}/api/nfe/operations?operation=../testing/test-artifact-operator`)).status, 404);
  assert.equal((await fetch(`${origin}/health`)).status, 200);
});
