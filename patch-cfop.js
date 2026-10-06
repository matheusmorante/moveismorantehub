const fs = require('fs');
const path = require('path');
const filePath = path.join('erp', 'src', 'pages', 'App', 'SalesOrder', 'OrderActions', 'nfe-modal', 'NfeItemRow.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace datalist
content = content.replace(/<datalist[\s\S]*?<\/datalist>/, `{cfopSearch !== null && (
                <ul className=\"absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800\">
                  {visibleCfopOptions.map((cf) => (
                    <li
                      key={cf.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (!cf.disabled) {
                          if (hasCfopError && onClearFieldError) onClearFieldError();
                          onUpdateFiscal('cfop', cf.value);
                          setCfopSearch(null);
                        }
                      }}
                      className={\`px-3 py-2 text-xs cursor-pointer \${
                        cf.disabled
                          ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50'
                          : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'
                      }\`}
                    >
                      <div className=\"font-bold\">{cf.value}</div>
                      <div className=\"text-slate-500 dark:text-slate-400\">{cf.label}</div>
                    </li>
                  ))}
                  {visibleCfopOptions.length === 0 && (
                    <li className=\"px-3 py-2 text-xs text-slate-500\">Nenhum CFOP encontrado.</li>
                  )}
                </ul>
              )}`);

content = content.replace('list={`nfe-item-cfop-options-${itemIndex}`}', '');

content = content.replace(
  '          <div className=\"mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-in fade-in duration-150\">\n            <div>',
  '          <div className=\"mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-in fade-in duration-150\">\n            <div className=\"relative\">'
);

content = content.replace(
  'onBlur={() => setCfopSearch(null)}',
  'onFocus={() => { if (cfopSearch === null) setCfopSearch(\'\'); }}\n                onBlur={() => setTimeout(() => setCfopSearch(null), 200)}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Script Node.js concluído com sucesso.');
