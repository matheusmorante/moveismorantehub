const fs = require('fs');
const path = 'erp/src/pages/utils/orderMutation/orderCrmSyncService.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("import { CustomerData } from '../../types/order.type';", "import type CustomerData from '../../types/customerData.type';");
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed CustomerData import');
