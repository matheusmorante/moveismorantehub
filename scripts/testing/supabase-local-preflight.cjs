'use strict';

const POLICY_ERROR = [
  'Testes PostgreSQL/Supabase Local estão desativados pela política do MoranteHub.',
  'Use somente o projeto Supabase remoto operacional, na branch primária e schema public.',
  'Consulte docs/testing/SUPABASE_REMOTE_TEST_POLICY.md; ausência de Docker não é bloqueio.'
].join(' ');

function refuseLocalRuntime() {
  throw new Error(POLICY_ERROR);
}

async function verifyLocalSupabase() {
  return refuseLocalRuntime();
}

if (require.main === module) {
  console.error(POLICY_ERROR);
  process.exitCode = 2;
}

module.exports = {
  verifyLocalSupabase,
  parseConfig: refuseLocalRuntime,
  localUrl: refuseLocalRuntime,
  assertInheritedDestinations: refuseLocalRuntime,
  assertLocalDockerTarget: refuseLocalRuntime,
  assertLocalTestSources: refuseLocalRuntime,
};
