const {test} = require('node:test');
const assert = require('node:assert/strict');
const {assertVercelDevelopment} = require('../assert-vercel-development.cjs');

test('Development rejects entry points without Vercel injection', () => {
  assert.throws(() => assertVercelDevelopment({}), /npm run dev/);
});
test('Development requires its runtime markers without fiscal environment flags', () => {
  assert.doesNotThrow(() => assertVercelDevelopment({
    MORANTE_ENV_SOURCE:'vercel-development',
    VERCEL_ENV:'development',
  }));
  assert.throws(() => assertVercelDevelopment({ MORANTE_ENV_SOURCE:'vercel-development' }), /npm run dev/);
});
