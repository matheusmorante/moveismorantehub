const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Rosilene\\Desktop\\pdv\\apps\\erp\\src\\pages\\App\\Products\\ProductFormModal.tsx', 'utf8');

let curly = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
        if (char === '{') curly++;
        if (char === '}') curly--;
    }
    if (i >= 136 && curly === 0) {
        console.log('Curly hit 0 at line:', i + 1);
    }
}
