const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
    isSacredPath,
    formatBytes,
    executeCleanup
} = require('./safe_cleanup');

console.log('🧪 Iniciando testes unitários do motor safe_cleanup.js...\n');

// 1. Teste de Arquivos Sagrados (Blacklist Rígida)
console.log('1. Testando proteção de arquivos sagrados...');
const sacredPaths = [
    '.git',
    '.git/config',
    '.git/objects/abc',
    '.env',
    '.env.local',
    '.env.production',
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'tsconfig.json',
    'tsconfig.node.json',
    'vite.config.ts',
    'metro.config.js',
    'app.json',
    'eas.json',
    'tailwind.config.js',
    'RULES.md',
    'README.md',
    'IDEIAS_E_PLANOS.md',
    'docs/README.md',
    'docs/negocio/estoque.md',
    '.agents/AGENTS.md',
    '.agents/skills/limpeza-projeto-segura/SKILL.md',
    'supabase/migrations/20260914140000_enforce_unique_order_indexes.sql',
];

for (const p of sacredPaths) {
    assert.strictEqual(isSacredPath(p), true, `Deveria proteger arquivo sagrado: ${p}`);
}

const nonSacredPaths = [
    'test-results',
    'erp/test-results',
    'temp_card_backup.tsx',
    'temp_row_backup.tsx',
    'tmp/erp-restart.log',
    'mobile/npx',
    'erp/tsc_output.txt',
    'dist',
    '.expo'
];

for (const p of nonSacredPaths) {
    assert.strictEqual(isSacredPath(p), false, `Não deveria bloquear arquivo limpável: ${p}`);
}
console.log('  ✅ Todos os caminhos sagrados foram devidamente protegidos!');

// 2. Teste de Formatação de Tamanho em KB/MB
console.log('\n2. Testando formatação de métricas em KB e MB...');
const zeroFormat = formatBytes(0);
assert.strictEqual(zeroFormat.kb, '0.00 KB');
assert.strictEqual(zeroFormat.mb, '0.00 MB');

const kbFormat = formatBytes(2048);
assert.strictEqual(kbFormat.kb, '2.00 KB');
assert.strictEqual(kbFormat.formatted, '2.00 KB (2048 B)');

const mbFormat = formatBytes(2 * 1024 * 1024);
assert.strictEqual(mbFormat.mb, '2.00 MB');
assert.strictEqual(mbFormat.kb, '2048.00 KB');
console.log('  ✅ Formatação de KB e MB validada com precisão decimal!');

// 3. Teste de Dry-Run (Garantia de que nenhum arquivo é apagado)
console.log('\n3. Testando execução em modo Dry-Run (Simulação)...');
const tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safe_cleanup_test_'));
const dummyFile = path.join(tempTestDir, 'temp_dummy_backup.tsx');
fs.writeFileSync(dummyFile, 'conteúdo de teste para remoção');
const dummySize = fs.statSync(dummyFile).size;

const testCandidate = {
    path: 'temp_dummy_backup.tsx',
    fullPath: dummyFile,
    isDir: false,
    category: 'Teste',
    reason: 'Teste temporário',
    sizeBytes: dummySize,
    sizeFormatted: formatBytes(dummySize)
};

const dryRunResults = executeCleanup([testCandidate], { execute: false });
assert.strictEqual(dryRunResults.isDryRun, true);
assert.strictEqual(dryRunResults.totalFilesRemoved, 1);
assert.strictEqual(dryRunResults.totalBytesFreed, dummySize);
assert.strictEqual(dryRunResults.items[0].status, 'SIMULADO');
assert.strictEqual(fs.existsSync(dummyFile), true, 'O arquivo NÃO deve ser apagado em modo dry-run');
console.log('  ✅ Modo dry-run simulou perfeitamente sem alterar o disco!');

// 4. Teste de Exclusão Real
console.log('\n4. Testando execução real (--execute)...');
const execResults = executeCleanup([testCandidate], { execute: true });
assert.strictEqual(execResults.isDryRun, false);
assert.strictEqual(execResults.totalFilesRemoved, 1);
assert.strictEqual(execResults.items[0].status, 'REMOVIDO');
assert.strictEqual(fs.existsSync(dummyFile), false, 'O arquivo DEVE ter sido apagado após execute');
console.log('  ✅ Modo execute removeu o arquivo com sucesso!');

// Teardown
fs.rmSync(tempTestDir, { recursive: true, force: true });

console.log('\n🎉 TODOS OS TESTES UNITÁRIOS DO MOTOR DE LIMPEZA FORAM APROVADOS COM SUCESSO!\n');
