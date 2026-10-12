'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const runner = path.join(__dirname, 'run-fiscal-e2e-in-env.cjs');
const validRunId = '550e8400-e29b-41d4-a716-446655440001';
const validOrderId = '550e8400-e29b-41d4-a716-446655440003';

function invoke(args, extraEnv = {}) {
  return spawnSync(process.execPath, [runner, ...args], {
    cwd: projectRoot,
    env: { ...extraEnv },
    encoding: 'utf8',
    windowsHide: true,
  });
}

test('fails when a preexisting runId and order UUID are not supplied', () => {
  const result = invoke(['hml']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FISCAL_E2E_RUN_ID.*UUID.*já persistida/i);
});

test('requires a scenario key linked to the persisted order', () => {
  const result = invoke(['hml', '--run-id', validRunId, '--order-id', validOrderId]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FISCAL_E2E_SCENARIO_KEY.*cenário persistido/i);
});

test('reads an already-persisted scenario from the Vercel Development runtime for the one-command runner', () => {
  const result = invoke(['hml'], {
    FISCAL_E2E_RUN_ID: validRunId,
    FISCAL_E2E_ORDER_ID: validOrderId,
    FISCAL_E2E_SCENARIO_KEY: 'nfe55_sale',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Variável de runtime ausente: VITE_SUPABASE_URL/i);
  assert.doesNotMatch(result.stderr, /run-id.*UUID|order-id.*UUID|scenario-key/i);
});

test('rejects fiscal scenario keys that this runner does not implement', () => {
  const result = invoke([
    'hml',
    '--run-id', validRunId,
    '--order-id', validOrderId,
    '--scenario-key', 'nfce65_return',
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /nfe55_sale, nfe55_delivery_own_transport, nfce65_pickup ou nfce65_delivery/i);
});

test('does not allow the transmission authorization switch in simulated mode', () => {
  const result = invoke([
    'simulated',
    '--run-id', validRunId,
    '--order-id', validOrderId,
    '--scenario-key', 'nfe55_sale',
    '--authorize-hml-transmission',
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /só pode ser usado no modo hml/i);
});
