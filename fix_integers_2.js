const fs = require('fs');
const path = 'erp/src/pages/App/Products/components/variationTabs/VariationAttributeValueInput.tsx';
let content = fs.readFileSync(path, 'utf8');

const regexOnChange = /onChange=\{\(e\) =>\s*onChange\(isDecimal \? maskDecimalValue\(e\.target\.value\) : e\.target\.value\)\s*\}/;
const replaceOnChange = `onChange={(e) => {
              if (isDecimal) {
                onChange(maskDecimalValue(e.target.value));
              } else {
                let val = e.target.value;
                if (/quantidade de (portas?|gavetas?)/i.test(attributeName || '') && Number(val) > 50) {
                  val = '50';
                }
                onChange(val);
              }
            }}`;

content = content.replace(regexOnChange, replaceOnChange);

fs.writeFileSync(path, content, 'utf8');
console.log('Script 2 ran.');
