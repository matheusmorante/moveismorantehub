const fs = require('fs');
const path = 'erp/src/pages/utils/technicalValuesService.ts';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('import type { Variation }')) {
    const importStr = "import type { Variation } from '../../types/product.type';\n";
    content = importStr + content;
    fs.writeFileSync(path, content, 'utf8');
    console.log('Added Variation import');
}
