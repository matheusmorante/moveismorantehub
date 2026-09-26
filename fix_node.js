const fs = require('fs');
const path = 'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/const term = \%\%\;/, 'const term = %\%;');
content = content.replace(/\.or\(\\\r?\n.*ilike.*?\)/, '.or(
ame.ilike.\,code.ilike.\)');
content = content.replace(/const description = product\.variationName \? \\ - \\ : product\.name;/, 'const description = product.variationName ? \${product.name} - \\ : product.name;');

fs.writeFileSync(path, content, 'utf8');
