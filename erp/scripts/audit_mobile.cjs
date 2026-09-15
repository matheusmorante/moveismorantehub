const fs = require('fs');
const path = require('path');

const MOBILE_SRC = path.resolve(__dirname, '../../mobile/src');

function countLines(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8').split('\n').length;
    } catch {
        return 0;
    }
}

function walkDir(dir, fileList = [], dirMap = {}) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const filesInDir = [];
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!['node_modules', '.git', 'dist', 'build', '.expo'].includes(entry.name)) {
                    walkDir(fullPath, fileList, dirMap);
                }
            } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
                const lines = countLines(fullPath);
                fileList.push({ path: fullPath, lines, name: entry.name });
                filesInDir.push({ path: fullPath, name: entry.name, lines });
            }
        }
        if (filesInDir.length > 0) {
            dirMap[dir] = filesInDir;
        }
    } catch (e) {
        console.error('Erro ao ler dir:', dir, e.message);
    }
    return { fileList, dirMap };
}

const mobileFiles = [];
const mobileDirs = {};
walkDir(MOBILE_SRC, mobileFiles, mobileDirs);

mobileFiles.sort((a, b) => b.lines - a.lines);

console.log('=== TOP 25 ARQUIVOS EXTENSOS NO MOBILE (PRINCÍPIOS DE PROGRAMAÇÃO) ===');
mobileFiles.slice(0, 25).forEach((f, idx) => {
    const rel = path.relative(path.resolve(__dirname, '../../'), f.path).replace(/\\/g, '/');
    console.log(`${idx + 1}. [${f.lines} linhas] ${rel}`);
});

console.log('\n=== PASTAS NO MOBILE COM MAIOR NÚMERO DE ARQUIVOS SOLTOS ===');
const mobileFolderAudits = Object.entries(mobileDirs).map(([dirPath, files]) => ({
    dir: path.relative(path.resolve(__dirname, '../../'), dirPath).replace(/\\/g, '/'),
    count: files.length,
})).sort((a, b) => b.count - a.count);

mobileFolderAudits.slice(0, 15).forEach((d, idx) => {
    console.log(`${idx + 1}. [${d.count} arquivos soltos] ${d.dir}`);
});
