const fs = require('fs');
const path = 'erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeItemRow.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("if (cfopSearch === null) setCfopSearch('');", "if (cfopSearch === null) setCfopSearch(selectedCfop);");
fs.writeFileSync(path, content, 'utf8');
