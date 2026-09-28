const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.git')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = [...walkSync('erp/src'), ...walkSync('mobile/src')];

const results = [];

const patterns = [
  /SupplierAutocomplete/i,
  /ProductAutocomplete/i,
  /ServiceAutocomplete/i,
  /AddressAutocomplete/i,
  /EmployeeSearchModal/i,
  /SellerSearchModal/i,
  /InventoryProductSearch/i,
  /useSupplierAutocomplete/i,
  /useProductAutocomplete/i,
  /usePersonSearch/i,
  /PersonSearch/i,
  /ClientSearch/i,
  /Autocomplete/i,
  /Combobox/i,
  /SearchSelect/i
];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match = false;
  for (const p of patterns) {
    if (p.test(content)) { match = true; break; }
  }
  if (match) results.push(f);
});

console.log('Found ' + results.length + ' files.');
fs.writeFileSync('audit_files.txt', results.join('\n'));