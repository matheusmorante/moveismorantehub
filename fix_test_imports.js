const fs = require('fs');

function replaceImport(path) {
    if (fs.existsSync(path)) {
        let content = fs.readFileSync(path, 'utf8');
        content = content.replace(/from '\.\.\/\.\.\/'/g, "from '../../orderMapper'");
        fs.writeFileSync(path, content, 'utf8');
        console.log('Fixed', path);
    }
}

replaceImport('erp/src/pages/utils/__tests__/strictNormalizedRead.test.ts');
replaceImport('erp/src/pages/utils/__tests__/unrealizedFactsAndBinding.test.ts');
replaceImport('erp/src/pages/utils/__tests__/voicePreAnalysisDebounce.test.ts');
