const {test} = require('node:test');
const assert = require('node:assert/strict');
const {assertVercelDevelopment} = require('../assert-vercel-development.cjs');

test('Development rejects entry points without Vercel injection', () => {
  assert.throws(() => assertVercelDevelopment({}), /npm run dev/);
});
test('Development requires injected homologation and production disabled', () => {
  assert.doesNotThrow(() => assertVercelDevelopment({
    MORANTE_ENV_SOURCE:'vercel-development',
    NFE_ENVIRONMENT:'2',
    NFE_PRODUCTION_ENABLED:'false',
  }));
  assert.throws(() => assertVercelDevelopment({MORANTE_ENV_SOURCE:'vercel-development',NFE_ENVIRONMENT:'1'}), /Homologacao/);
  assert.throws(() => assertVercelDevelopment({
    MORANTE_ENV_SOURCE:'vercel-development',
    NFE_ENVIRONMENT:'2',
    NFE_PRODUCTION_ENABLED:'true',
  }), /NFE_PRODUCTION_ENABLED=false/);
  assert.throws(() => assertVercelDevelopment({
    MORANTE_ENV_SOURCE:'vercel-development',
    NFE_PRODUCTION_ENABLED:'false',
  }), /NFE_ENVIRONMENT=2/);
});
