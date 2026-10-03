const fs = require('fs');
const file = 'erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/normalizedEffectiveValue !== '' &&\s*/g, '');
fs.writeFileSync(file, data, 'utf8');
console.log('Fixed');
