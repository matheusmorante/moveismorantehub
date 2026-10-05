const fs = require('fs');

let path1 = 'erp/src/pages/App/Products/modals/VariationFormModal.tsx';
let content1 = fs.readFileSync(path1, 'utf8');
content1 = content1.replace(/'Cadastrar OK'/g, "'Cadastrar'");
fs.writeFileSync(path1, content1, 'utf8');

let path2 = 'erp/src/pages/App/Products/components/VariationRow.tsx';
let content2 = fs.readFileSync(path2, 'utf8');
content2 = content2.replace(/clique em Cadastrar OK para/g, 'clique em Cadastrar para');
fs.writeFileSync(path2, content2, 'utf8');

console.log('Modified both files');
