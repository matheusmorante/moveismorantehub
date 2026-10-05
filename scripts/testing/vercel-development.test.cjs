const {test} = require('node:test');
const assert = require('node:assert/strict');
const {assertVercelDevelopment} = require('../assert-vercel-development.cjs');

test('Development rejects entry points without Vercel injection', () => {
  assert.throws(() => assertVercelDevelopment({}), /npm run dev/);
});
test('Development accepts injected homologation only', () => {
  assert.doesNotThrow(() => assertVercelDevelopment({MORANTE_ENV_SOURCE:'vercel-development',NFE_ENVIRONMENT:'2'}));
  assert.throws(() => assertVercelDevelopment({MORANTE_ENV_SOURCE:'vercel-development',NFE_ENVIRONMENT:'1'}), /Homologacao/);
});
test('Development default remains homologation when env flag is absent', () => {
  assert.doesNotThrow(() => assertVercelDevelopment({MORANTE_ENV_SOURCE:'vercel-development'}));
});
