const fs = require('fs');

const files = fs.readFileSync('audit_files.txt', 'utf8').split('\n').filter(Boolean);

let report = [];

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const filename = f.split(/[\/\\]/).pop();
    
    // Check for Autocomplete / Combobox usages
    if (content.includes('<SupplierAutocomplete')) {
        report.push({ file: f, component: 'SupplierAutocomplete', type: 'supplier', origin: 'subscribeToPeople/local' });
    }
    if (content.includes('<ProductAutocomplete')) {
        report.push({ file: f, component: 'ProductAutocomplete', type: 'product', origin: 'fetchAllProductSearchResults' });
    }
    if (content.includes('useProductAutocomplete(')) {
        report.push({ file: f, component: 'useProductAutocomplete', type: 'product', origin: 'fetchAllProductSearchResults' });
    }
    if (content.includes('useSupplierAutocomplete(')) {
        report.push({ file: f, component: 'useSupplierAutocomplete', type: 'supplier', origin: 'subscribeToPeople' });
    }
    if (content.includes('<ServiceAutocomplete')) {
        report.push({ file: f, component: 'ServiceAutocomplete', type: 'service', origin: 'subscribeToServices' });
    }
    if (content.includes('<EmployeeSearchModal') || content.includes('<SellerSearchModal')) {
        report.push({ file: f, component: 'EmployeeSearchModal', type: 'employee', origin: 'subscribeToPeople' });
    }
    if (content.includes('<AddressAutocompleteInput')) {
        report.push({ file: f, component: 'AddressAutocompleteInput', type: 'address', origin: 'google/local' });
    }
    if (content.includes('<InventoryProductSearchModal')) {
        report.push({ file: f, component: 'InventoryProductSearchModal', type: 'product', origin: 'useProductSearch' });
    }
});

fs.writeFileSync('audit_report_raw.json', JSON.stringify(report, null, 2));
console.log('Report generated with ' + report.length + ' entries.');