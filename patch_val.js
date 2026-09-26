const fs = require('fs');
const filePath = 'erp/src/pages/utils/validations.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetRegex = /const hideHandling = isBudget \|\| isReturn;\s*items\.forEach\(\(item, idx\) => {[\s\S]*?errors\[`item_\$\{idx\}_handlingType`\] = "O manuseio do item Ã© obrigatÃ³rio.";\s*}\s*}\);/;

const replacement = `const hideHandling = isBudget || isReturn;
    items.forEach((item, idx) => {
        if (!item) return;
        if (!item.description || item.description.trim() === "") {
            errors[\`item_\${idx}_description\`] = "A descriÃ§Ã£o do item Ã© obrigatÃ³ria.";
        }
        
        const isService = item.itemType === 'service';
        if (!hideHandling && !isService && (!item.handlingType || item.handlingType.trim() === "")) {
            errors[\`item_\${idx}_handlingType\`] = "O manuseio do item Ã© obrigatÃ³rio.";
        }
    });`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Target not found');
}
