const fs = require('fs');
const path = 'erp/src/pages/App/Products/components/tabs/technical/TechnicalFieldInput.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacementStr = `
function SmallListChips({
  options,
  value,
  disabled,
  onChange,
}: {
  options: readonly { id?: string; value: string }[];
  value: any;
  disabled?: boolean;
  onChange: (v: any) => void;
}) {
  const selectedStr = String(value || '').trim();
  
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(o => {
        const isSelected = String(o.value).trim() === selectedStr;
        return (
          <button
            key={o.id || o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(isSelected ? '' : o.value)}
            className={\`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border \${
              isSelected 
                ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
            } \${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}\`}
          >
            {o.value}
          </button>
        );
      })}
    </div>
  );
}
`;

if (!content.includes('SmallListChips')) {
    content += '\n' + replacementStr;
}

const targetStrRadio = `  if (type === 'radio')
    return (
      <ChoiceSearch
        options={field.options}
        value={value}
        disabled={disabled}
        multiple={false}
        onChange={onChange}
      />
    );`;

const replacementStrRadio = `  const isSmallList = field.options && field.options.length > 0 && field.options.length < 5;

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

if (content.includes(targetStrRadio)) {
    content = content.replace(targetStrRadio, replacementStrRadio);
}

const targetStrCombo = `  return (
    <TechnicalCombobox
      fieldName={field.name}
      value={Array.isArray(value) ? value.join(', ') : (value ?? '')}
      options={field.options}`;

const replacementStrCombo = `  if ((type === 'list' || !type) && field.options && field.options.length > 0 && field.options.length < 5) {
    return (
      <SmallListChips options={field.options} value={value} disabled={disabled} onChange={onChange} />
    );
  }

  return (
    <TechnicalCombobox
      fieldName={field.name}
      value={Array.isArray(value) ? value.join(', ') : (value ?? '')}
      options={field.options}`;

if (content.includes(targetStrCombo)) {
    content = content.replace(targetStrCombo, replacementStrCombo);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Script ran.');
