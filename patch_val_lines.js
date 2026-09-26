const fs = require('fs');
const filePath = 'erp/src/pages/utils/validations.ts';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const newLines = `    const hideHandling = isBudget || isReturn;
    items.forEach((item, idx) => {
        if (!item) return;
        if (!item.description || item.description.trim() === "") {
            errors[\`item_\${idx}_description\`] = "A descriÃ§Ã£o do item Ã© obrigatÃ³ria.";
        }
        const isService = item.itemType === 'service';
        if (!hideHandling && !isService && (!item.handlingType || item.handlingType.trim() === "")) {
            errors[\`item_\${idx}_handlingType\`] = "O manuseio do item Ã© obrigatÃ³rio.";
        }
    });`.split('\n');

lines.splice(13, 11, ...newLines);
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Replaced by line indices successfully');
