const fs = require('fs');
const path = require('path');

const COMP_DIR = path.resolve(__dirname, '../src/pages/App/SalesOrder/components');
const filesInComp = fs.readdirSync(COMP_DIR).filter(f => /\.(tsx|ts)$/.test(f));

for (const file of filesInComp) {
    const fullPath = path.join(COMP_DIR, file);
    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;

    for (const sibling of filesInComp) {
        const baseName = sibling.replace(/\.tsx$|\.ts$/, '');
        // Se houver import de '../<baseName>' ou '../components/<baseName>'
        const regex1 = new RegExp(`from\\s+['"]\\.\\.\/${baseName}['"]`, 'g');
        const regex2 = new RegExp(`from\\s+['"]\\.\\.\/components\/${baseName}['"]`, 'g');

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
        console.log(`Corrigido import irmão em: ${file}`);
    }
}
