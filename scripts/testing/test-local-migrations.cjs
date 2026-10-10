'use strict';

console.error([
  'test:migrations está desativado: MoranteHub não usa Docker, Supabase Local ou banco local.',
  'Consulte docs/testing/SUPABASE_REMOTE_TEST_POLICY.md e use somente o projeto remoto existente.',
  'Este comando não executa reset nem inicia qualquer runtime.'
].join(' '));
process.exitCode = 2;
