const fs = require('fs');
const path = 'erp/src/pages/App/Products/modals/VariationFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const searchStr = "{loading ? 'Salvando...' : autoSaveStatus === 'error' ? 'Salvar novamente' : 'Concluir'}";
const replaceStr = "{loading ? 'Salvando...' : autoSaveStatus === 'error' ? 'Salvar novamente' : variation ? 'Salvar Alterações' : 'Cadastrar OK'}";

content = content.replace(searchStr, replaceStr);
fs.writeFileSync(path, content, 'utf8');
console.log('Modified VariationFormModal.tsx');
