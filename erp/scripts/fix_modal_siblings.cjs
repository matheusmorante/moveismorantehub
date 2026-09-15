const fs = require('fs');
const path = require('path');

const MODALS_DIR = path.resolve(__dirname, '../src/pages/App/SalesOrder/modals');
const filesInModals = fs.readdirSync(MODALS_DIR).filter(f => /\.(tsx|ts)$/.test(f));

for (const file of filesInModals) {
    const fullPath = path.join(MODALS_DIR, file);
    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;

    for (const sibling of filesInModals) {
        const baseName = sibling.replace(/\.tsx$|\.ts$/, '');
        const regex1 = new RegExp(`from\\s+['"]\\.\\.\/${baseName}['"]`, 'g');
        const regex2 = new RegExp(`from\\s+['"]\\.\\.\/modals\/${baseName}['"]`, 'g');

        if (regex1.test(content)) {
            content = content.replace(regex1, `from './${baseName}'`);
            modified = true;
        }
        if (regex2.test(content)) {
            content = content.replace(regex2, `from './${baseName}'`);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Corrigido import irmão em modal: ${file}`);
    }
}
