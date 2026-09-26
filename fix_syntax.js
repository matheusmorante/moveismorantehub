const fs = require('fs');
const path = 'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/const term = \%\%\;/, 'const term = \%\%\;');
content = content.replace(/\.or\(\\,code\.ilike\\,\)/, '.or(\
ame.ilike.\,code.ilike.\\)');
content = content.replace(/\{r\.name\}\{r\.variationName \?  : ''\}/, "{r.name}{r.variationName ? ' - ' + r.variationName : ''}");

fs.writeFileSync(path, content, 'utf8');
