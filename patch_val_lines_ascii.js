const fs = require('fs');
const filePath = 'erp/src/pages/utils/validations.ts';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const newLines = `    const hideHandling = isBudget || isReturn;
    items.forEach((item, idx) => {
        if (!item) return;
        if (!item.description || item.description.trim() === "") {
            errors[\`item_\${idx}_description\`] = "A descricao do item e obrigatoria.";
        }
        const isService = item.itemType === 'service';
        if (!hideHandling && !isService && (!item.handlingType || item.handlingType.trim() === "")) {
            errors[\`item_\${idx}_handlingType\`] = "O manuseio do item e obrigatorio.";
        }
    });`.split('\n');

lines.splice(13, 11, ...newLines);
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Replaced by line indices successfully');
