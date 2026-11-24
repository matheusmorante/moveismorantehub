const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\Rosilene\\Desktop\\pdv\\apps\\erp\\src\\pages\\App\\Products\\ProductFormModal.tsx', 'utf8');

let curly = 0;
let paren = 0;
let square = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') curly++;
    if (char === '}') curly--;
    if (char === '(') paren++;
    if (char === ')') paren--;
    if (char === '[') square++;
    if (char === ']') square--;
}

console.log('Curly:', curly);
console.log('Paren:', paren);
console.log('Square:', square);
