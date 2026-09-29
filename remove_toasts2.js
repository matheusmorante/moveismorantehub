const fs = require('fs');
const path = 'erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelQueue.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/toast\.success\(\\$\{fullName\} \(\$\{quantity\} un\).*?\);/g, '');
c = c.replace(/toast\.success\(\Etiqueta em branco \(\$\{quantity\} un\).*?\);/g, '');

fs.writeFileSync(path, c);
console.log('Removed toasts properly');
