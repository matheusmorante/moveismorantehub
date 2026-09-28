const fs = require('fs');
const content = fs.readFileSync('erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx', 'utf8');
const lines = content.split('\n');
const match = lines.findIndex(l => l.includes('handleSelectProduct'));
if (match !== -1) {
    console.log(lines.slice(Math.max(0, match - 5), match + 30).join('\n'));
}