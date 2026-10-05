const fs = require('fs');
const path = require('path');

const baseDir = 'erp/src';

const replacements = [
    { search: /isSalvadoProduct/g, replace: 'isNonConventionalProduct' },
    { search: /isSalvado=/g, replace: 'isNonConventional=' },
    { search: /isSalvado\?:/g, replace: 'isNonConventional?:' },
    { search: /isSalvado(?=\s*[=}?:])/g, replace: 'isNonConventional' },
    { search: /isSalvado\s*,/g, replace: 'isNonConventional,' },
    { search: /setShowSalvadoPopover/g, replace: 'setShowNonConventionalPopover' },
    { search: /showSalvadoPopover/g, replace: 'showNonConventionalPopover' },
    { search: /isSalvado \?/g, replace: 'isNonConventional ?' },
    { search: /produtos com origem Salvados não podem ser ativados no ERP/g, replace: 'produtos com origem diferente de Convencional não podem ser ativados no ERP' },
    { search: /Produtos de origem de estoque salvados não podem ser ativados no ERP/g, replace: 'Produtos de origem de estoque diferente de Convencional não podem ser ativados no ERP' },
    { search: /Origem do estoque deve ser Convencional \(produtos com origem Salvados/g, replace: 'Origem do estoque deve ser Convencional (produtos com origem diferente de Convencional' },
    { search: /isSalvadoProduct\(formData\)/g, replace: 'isNonConventionalProduct(formData)' },
];

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            for (const { search, replace } of replacements) {
                if (search.test(content)) {
                    content = content.replace(search, replace);
                    modified = true;
                }
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Modified:', fullPath);
            }
        }
    }
}

walkDir(baseDir);

// Fix productKindRules.ts specifically for the implementation
const pkrPath = 'erp/src/pages/utils/productKindRules.ts';
let pkrContent = fs.readFileSync(pkrPath, 'utf8');
pkrContent = pkrContent.replace(
    /export const isNonConventionalProduct = \(value\?: \{ productKind\?: unknown \} \| null\): boolean =>\s*getProductKind\(value\) === 'salvado';/,
    `export const isNonConventionalProduct = (value?: { productKind?: unknown } | null): boolean =>\n  getProductKind(value) !== 'normal';`
);
fs.writeFileSync(pkrPath, pkrContent, 'utf8');
console.log('Fixed productKindRules.ts implementation');
