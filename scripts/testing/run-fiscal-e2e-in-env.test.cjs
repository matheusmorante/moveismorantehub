'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const runner = path.join(__dirname, 'run-fiscal-e2e-in-env.cjs');
const validRunId = '550e8400-e29b-41d4-a716-446655440001';
const validOrderId = '550e8400-e29b-41d4-a716-446655440003';

function invoke(args) {
  return spawnSync(process.execPath, [runner, ...args], {
    cwd: projectRoot,
    env: {},
    encoding: 'utf8',
    windowsHide: true,
  });
}

test('fails when a preexisting runId and order UUID are not supplied', () => {
  const result = invoke(['hml']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /run-id.*UUID.*já persistida/i);
});

test('requires a scenario key linked to the persisted order', () => {
  const result = invoke(['hml', '--run-id', validRunId, '--order-id', validOrderId]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /scenario-key.*identificação.*cenário persistido/i);
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
