const fs = require('fs');
const path = 'erp/src/pages/App/Products/components/tabs/technical/TechnicalFieldInput.tsx';
let content = fs.readFileSync(path, 'utf8');

const regexType = /const type = field\.dataType \|\| 'list';/;
const replaceType = `let type = field.dataType || 'list';
  if (/quantidade de (portas?|gavetas?)/i.test(field.name)) {
    type = 'integer';
  }`;
content = content.replace(regexType, replaceType);

// Now enforcing max 50:
// Original: onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
const regexOnChange = /onChange=\{\(e\) => onChange\(e\.target\.value === '' \? '' : Number\(e\.target\.value\)\)\}/;
const replaceOnChange = `onChange={(e) => {
          let val = e.target.value === '' ? '' : Number(e.target.value);
          if (typeof val === 'number' && val > 50) val = 50;
          onChange(val);
        }}`;
content = content.replace(regexOnChange, replaceOnChange);

fs.writeFileSync(path, content, 'utf8');
console.log('Script ran.');
