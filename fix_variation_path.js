const fs = require('fs');
const path = 'erp/src/pages/utils/technicalValuesService.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("import type { Variation } from '../../types/product.type';", "import type { Variation } from '../types/product.type';");
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Variation import path');
