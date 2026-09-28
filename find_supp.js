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

const files = walkSync('erp/src');
const usages = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('SupplierAutocomplete') && !f.includes('SupplierAutocomplete.tsx') && !f.includes('useSupplierAutocomplete')) {
    usages.push(f);
  }
});
console.log(usages.join('\n'));