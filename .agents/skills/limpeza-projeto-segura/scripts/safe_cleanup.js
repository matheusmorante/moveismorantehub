#!/usr/bin/env node

/**
 * Script de Limpeza Segura do Morante Hub
 * 
 * Identifica e remove com segurança arquivos e pastas desnecessários,
 * lixos de SO, caches de build, dumps temporários e órfãos de código.
 * 
 * Uso:
 *   node safe_cleanup.js [--dry-run] [--execute] [--clean-builds] [--include-scratch] [--json]
 */

const fs = require('fs');
const path = require('path');

// Raiz do projeto (assume que o script está em .agents/skills/limpeza-projeto-segura/scripts/)
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');

// ==========================================
// 1. LISTA DE BLOQUEIO RÍGIDA (ARQUIVOS SAGRADOS)
// ==========================================
const SACRED_PATTERNS = [
    /^\.git(\/|\\|$)/,
    /^\.agents(\/|\\|$)/,
    /^docs(\/|\\|$)/,
    /^supabase[/\\]migrations(\/|\\|$)/,
    /^\.env(\..+)?$/,
    /^package\.json$/,
    /^package-lock\.json$/,
    /^pnpm-lock\.yaml$/,
    /^yarn\.lock$/,
    /^tsconfig.*\.json$/,
    /^vite\.config\.[a-z]+$/,
    /^metro\.config\.[a-z]+$/,
    /^app\.json$/,
    /^eas\.json$/,
    /^tailwind\.config\.[a-z]+$/,
    /^postcss\.config\.[a-z]+$/,
    /^RULES\.md$/,
    /^README\.md$/,
    /^IDEIAS_E_PLANOS\.md$/,
];

function isSacredPath(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/');
    return SACRED_PATTERNS.some(pattern => pattern.test(normalized));
}

// ==========================================
// 2. FORMATAÇÃO DE TAMANHO E MÉTRICAS
// ==========================================
function formatBytes(bytes) {
    if (bytes === 0) return { raw: 0, kb: '0.00 KB', mb: '0.00 MB', formatted: '0 B' };
    const kb = (bytes / 1024).toFixed(2);
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    let formatted;
    if (bytes >= 1024 * 1024) {
        formatted = `${mb} MB (${kb} KB)`;
    } else if (bytes >= 1024) {
        formatted = `${kb} KB (${bytes} B)`;
    } else {
        formatted = `${bytes} B`;
    }
    return { raw: bytes, kb: `${kb} KB`, mb: `${mb} MB`, formatted };
}

function getDirSizeBytes(dirPath) {
    let total = 0;
    if (!fs.existsSync(dirPath)) return 0;
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                total += getDirSizeBytes(full);
            } else if (entry.isFile() || entry.isSymbolicLink()) {
                try {
                    total += fs.statSync(full).size;
                } catch { }
            }
        }
    } catch { }
    return total;
}

// ==========================================
// 3. ANÁLISE ESTÁTICA: VERIFICAÇÃO DE USO EM CÓDIGO
// ==========================================
function isReferencedInSourceCode(filename, rootDir) {
    const searchDirs = [
        path.join(rootDir, 'erp/src'),
        path.join(rootDir, 'mobile/src'),
        path.join(rootDir, 'api'),
        path.join(rootDir, 'src')
    ];

    const baseName = path.basename(filename, path.extname(filename));
    if (baseName.length < 3) return true; // Segurança adicional para nomes muito curtos

    function searchInDir(dir) {
        if (!fs.existsSync(dir)) return false;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (searchInDir(full)) return true;
            } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
                try {
                    const content = fs.readFileSync(full, 'utf8');
                    if (content.includes(baseName)) {
                        return true;
                    }
                } catch { }
            }
        }
        return false;
    }

    for (const d of searchDirs) {
        if (searchInDir(d)) return true;
    }
    return false;
}

// ==========================================
// 4. VARREDURA DE CANDIDATOS POR CATEGORIA
// ==========================================
function scanProject(rootDir, options = {}) {
    const candidates = [];

    function addCandidate(relPath, isDir, category, reason) {
        const fullPath = path.join(rootDir, relPath);
        if (!fs.existsSync(fullPath)) return;

        if (isSacredPath(relPath)) {
            return; // Bloqueio inviolável
        }

        let size = 0;
        try {
            size = isDir ? getDirSizeBytes(fullPath) : fs.statSync(fullPath).size;
        } catch { }

        candidates.push({
            path: relPath.replace(/\\/g, '/'),
            fullPath,
            isDir,
            category,
            reason,
            sizeBytes: size,
            sizeFormatted: formatBytes(size)
        });
    }

    // --- NÍVEL 1: Lixo de SO, Relatórios Voláteis, Dumps de Terminal ---
    const volatileDirs = [
        'test-results',
        'erp/test-results',
        'playwright-report',
        'erp/playwright-report',
        'erp/playwright-report-mobile',
        '.expo-ota-validation',
        'mobile/.expo-ota-validation'
    ];
    for (const d of volatileDirs) {
        addCandidate(d, true, 'Nível 1 (Relatórios Voláteis)', 'Pasta de relatórios/logs de testes temporários');
    }

    const explicitGarbageFiles = [
        'mobile/npx',
        'erp/tsc_output.txt',
        'checklist_output.txt'
    ];
    for (const f of explicitGarbageFiles) {
        addCandidate(f, false, 'Nível 1 (Lixo e Dumps)', 'Dump de terminal ou arquivo de erro de comando órfão');
    }

    // Varredura de logs em tmp/
    const tmpDir = path.join(rootDir, 'tmp');
    if (fs.existsSync(tmpDir)) {
        try {
            const files = fs.readdirSync(tmpDir);
            for (const file of files) {
                if (file.endsWith('.log') || file.endsWith('.tmp')) {
                    addCandidate(path.join('tmp', file), false, 'Nível 1 (Logs Temporários)', 'Log volátil em pasta tmp');
                }
            }
        } catch { }
    }

    // --- NÍVEL 2: Caches e Builds Regeneráveis (Opcional com --clean-builds) ---
    if (options.cleanBuilds) {
        const buildDirs = [
            'dist',
            'erp/dist',
            'mobile/dist',
            'mobile/.expo',
            '.turbo',
            'erp/.turbo',
            '.parcel-cache'
        ];
        for (const b of buildDirs) {
            addCandidate(b, true, 'Nível 2 (Builds e Caches)', 'Artefato compilado regenerável via build');
        }
    }

    // --- NÍVEL 3: Backups e Órfãos Temporários de Código ---
    const orphanCodeCandidates = [
        'temp_card_backup.tsx',
        'temp_row_backup.tsx',
        'test_gemini_audio.wav',
        'erp/drawBannerSync_extracted.tsx',
        'erp/extract.ts',
        'erp/new_extract.ts'
    ];

    for (const candidate of orphanCodeCandidates) {
        const full = path.join(rootDir, candidate);
        if (fs.existsSync(full)) {
            // Checagem estrita de referências
            const isUsed = isReferencedInSourceCode(candidate, rootDir);
            if (!isUsed) {
                addCandidate(candidate, false, 'Nível 3 (Backups/Órfãos de Refatoração)', 'Arquivo órfão sem nenhum import ou referência ativa');
            }
        }
    }

    // --- NÍVEL 4: Scratches e Scripts Utilitários (Opcional com --include-scratch) ---
    if (options.includeScratch) {
        const scratchDir = path.join(rootDir, 'scratch');
        if (fs.existsSync(scratchDir)) {
            try {
                const files = fs.readdirSync(scratchDir);
                for (const file of files) {
                    addCandidate(path.join('scratch', file), false, 'Nível 4 (Scratch Scripts)', 'Script pontual de diagnóstico em scratch/');
                }
            } catch { }
        }
    }

    return candidates;
}

// ==========================================
// 5. EXECUÇÃO DA REMOÇÃO
// ==========================================
function executeCleanup(candidates, options = {}) {
    const isDryRun = !options.execute;
    const results = {
        isDryRun,
        totalFilesRemoved: 0,
        totalDirsRemoved: 0,
        totalBytesFreed: 0,
        items: []
    };

    for (const item of candidates) {
        let removed = false;
        let error = null;

        if (!isDryRun) {
            try {
                if (item.isDir) {
                    fs.rmSync(item.fullPath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(item.fullPath);
                }
                removed = true;
            } catch (err) {
                error = err.message;
            }
        } else {
            removed = false;
        }

        if (removed || isDryRun) {
            results.totalBytesFreed += item.sizeBytes;
            if (item.isDir) {
                results.totalDirsRemoved++;
            } else {
                results.totalFilesRemoved++;
            }
        }

        results.items.push({
            ...item,
            status: isDryRun ? 'SIMULADO' : (removed ? 'REMOVIDO' : 'ERRO'),
            error
        });
    }

    results.metricsFormatted = formatBytes(results.totalBytesFreed);
    return results;
}

// ==========================================
// 6. IMPRESSÃO FORMATADA CLI
// ==========================================
function printReport(results) {
    console.log('\n' + '='.repeat(80));
    console.log(results.isDryRun
        ? '🔍 RELATÓRIO DE LIMPEZA SEGURA DE PROJETO (MODO SIMULAÇÃO / DRY-RUN)'
        : '🚀 RELATÓRIO DE EXECUÇÃO DA LIMPEZA SEGURA DE PROJETO'
    );
    console.log('='.repeat(80));

    if (results.items.length === 0) {
        console.log('\n✨ Nenhum arquivo ou diretório desnecessário foi encontrado. O projeto está 100% limpo!\n');
        return;
    }

    console.log(`\nItens Identificados (${results.items.length}):\n`);
    const pad = (str, len) => (str + ' '.repeat(Math.max(0, len - str.length))).slice(0, len);

    console.log(`  ${pad('CATEGORIA', 32)} ${pad('STATUS', 12)} ${pad('TAMANHO', 22)} CAMINHO`);
    console.log('  ' + '-'.repeat(76));

    for (const item of results.items) {
        const cat = pad(item.category, 32);
        const st = pad(item.status, 12);
        const sz = pad(item.sizeFormatted.formatted, 22);
        console.log(`  ${cat} ${st} ${sz} ${item.path}`);
    }

    console.log('\n' + '-'.repeat(80));
    console.log('📊 CONSOLIDAÇÃO DAS MÉTRICAS:');
    console.log(`  - Total de Arquivos: ${results.totalFilesRemoved}`);
    console.log(`  - Total de Pastas:   ${results.totalDirsRemoved}`);
    console.log(`  - Tamanho em KB:     ${results.metricsFormatted.kb}`);
    console.log(`  - Tamanho em MB:     ${results.metricsFormatted.mb}`);
    console.log(`  - Total Consolidado: ${results.metricsFormatted.formatted}`);
    console.log('='.repeat(80));

    if (results.isDryRun) {
        console.log('\n💡 DICA: Para executar a limpeza real e liberar o espaço em disco, execute:');
        console.log('   node .agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js --execute\n');
    } else {
        console.log('\n✅ Limpeza concluída com sucesso e segurança no Morante Hub!\n');
    }
}

// ==========================================
// 7. PONTO DE ENTRADA
// ==========================================
function main() {
    const args = process.argv.slice(2);
    const options = {
        execute: args.includes('--execute') || args.includes('--apply'),
        cleanBuilds: args.includes('--clean-builds'),
        includeScratch: args.includes('--include-scratch'),
        json: args.includes('--json')
    };

    const candidates = scanProject(PROJECT_ROOT, options);
    const results = executeCleanup(candidates, options);

    if (options.json) {
        console.log(JSON.stringify(results, null, 2));
    } else {
        printReport(results);
    }
}

// Exportações para testes unitários
module.exports = {
    PROJECT_ROOT,
    isSacredPath,
    formatBytes,
    getDirSizeBytes,
    isReferencedInSourceCode,
    scanProject,
    executeCleanup
};

if (require.main === module) {
    main();
}
