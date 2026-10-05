const fs = require('fs');
const path = 'erp/src/pages/App/Products/components/tabs/technical/TechnicalFieldInput.tsx';
let content = fs.readFileSync(path, 'utf8');

const regexRadio = /if\s*\(type === 'radio'\)[\s\S]*?onChange=\{onChange\}[\s\S]*?\/\>[\s\S]*?\);/;

const replRadio = `const isSmallList = field.options && field.options.length > 0 && field.options.length < 5;

  if (type === 'radio') {
    if (isSmallList) {
      return (
        <SmallListChips options={field.options} value={value} disabled={disabled} onChange={onChange} />
      );
    }
    return (
      <ChoiceSearch
        options={field.options}
        value={value}
        disabled={disabled}
        multiple={false}
        onChange={onChange}
      />
    );
  }`;

content = content.replace(regexRadio, replRadio);

const regexCombo = /return\s*\(\s*<TechnicalCombobox[\s\S]*?fieldName=\{field.name\}[\s\S]*?value=\{Array.isArray\(value\)\s*\?\s*value\.join\('', '\'\)\s*:\s*\(value\s*\?\?\s*''\)\}[\s\S]*?options=\{field.options\}[\s\S]*?isInvalid=\{isInvalid\}[\s\S]*?disabled=\{disabled\}[\s\S]*?onChange=\{onChange\}[\s\S]*?\/\>[\s\S]*?\);/;
const regexCombo2 = /return\s*\(\s*<TechnicalCombobox[\s\S]*?onChange=\{onChange\}\s*\/\>\s*\);/;

const replCombo = `if ((type === 'list' || !type) && field.options && field.options.length > 0 && field.options.length < 5) {
    return (
      <SmallListChips options={field.options} value={value} disabled={disabled} onChange={onChange} />
    );
  }

  return (
    <TechnicalCombobox
      fieldName={field.name}
      value={Array.isArray(value) ? value.join(', ') : (value ?? '')}
      options={field.options}
      isInvalid={isInvalid}
      disabled={disabled}
      onChange={onChange}
    />
  );`;

content = content.replace(regexCombo2, replCombo);

fs.writeFileSync(path, content, 'utf8');
console.log('Script completed');
