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

test('does not allow the transmission authorization switch in simulated mode', () => {
  const result = invoke([
    'simulated',
    '--run-id', validRunId,
    '--order-id', validOrderId,
    '--authorize-hml-transmission',
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /só pode ser usado no modo hml/i);
});
