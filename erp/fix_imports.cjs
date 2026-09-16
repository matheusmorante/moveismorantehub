const fs = require('fs');
const path = require('path');

const base = 'c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Products/ProductList';

const filesToProxy = {
  'ProductCard.tsx': 'components/ProductCard',
  'ProductTable.tsx': 'components/ProductTable',
  'useProducts.ts': 'hooks/useProducts',
  'useProductsCatalogActions.ts': 'hooks/useProductsCatalogActions',
  'productActivationState.ts': 'utils/productActivationState',
  'productCatalogState.ts': 'utils/productCatalogState',
  'productSelection.ts': 'utils/productSelection',
  'productTableColumns.ts': 'utils/productTableColumns',
};

// Create proxies
for (const [file, target] of Object.entries(filesToProxy)) {
  const isDefault = file.includes('ProductCard') || file.includes('ProductTable');
  const exportStr = isDefault ? `export { default } from './${target}';` : (file === 'useProducts.ts' ? `export { useProducts } from './${target}';` : `export * from './${target}';`);
  fs.writeFileSync(path.join(base, file), exportStr);
}

// Now let's fix imports recursively in all .ts and .tsx files inside components, hooks, utils, modals
function fixImports(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixImports(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            // Fix imports pointing to root (./) that now need to point to siblings (../utils, ../hooks, etc)
            // Example: import { X } from './useProducts' -> import { X } from '../hooks/useProducts'
            const importRegex = /from\s+['"]\.\/([^'"]+)['"]/g;
            content = content.replace(importRegex, (match, importPath) => {
                // Determine where importPath lives now
                let newDir = null;
                const basename = importPath.split('/').pop();
                
                // Map based on where files are
                if (['ProductCard', 'ProductTable', 'ProductRow', 'ChannelStatusBadges', 'ProductBulkActionsToolbar', 'ProductCardActions', 'ProductCardVariationList', 'ProductRowActionsCell', 'ProductRowDescriptionCell', 'ProductRowModals', 'ProductRowStandardCells'].includes(basename)) newDir = 'components';
                if (['useProducts', 'useProductsCatalogActions', 'useProductsActivationValidation', 'useProductsActivePersistence', 'useProductsDeletionActions', 'useVariationExitFlags', 'useProductMetadata'].includes(basename)) newDir = 'hooks';
                if (['productActivationState', 'productCatalogState', 'productSelection', 'productTableColumns', 'productListFiltering', 'productListTransformers', 'getVariationDisplayName', 'registeredVariationCount'].includes(basename)) newDir = 'utils';
                if (['MergeVariationModal', 'MoveVariationFamilyModal'].includes(basename)) newDir = 'modals';

                if (newDir) {
                    changed = true;
                    // if the file doing the import is inside 'components' and the target is in 'components', the relative path is './'
                    const currentDir = path.basename(dir);
                    if (currentDir === newDir) {
                        return `from './${importPath}'`;
                    } else {
                        return `from '../${newDir}/${importPath}'`;
                    }
                }
                return match;
            });

            // Adjust imports going UP (e.g. ../../../types -> ../../../../types)
            const upImportRegex = /from\s+['"](\.\.\/.+)['"]/g;
            content = content.replace(upImportRegex, (match, importPath) => {
                if (!importPath.startsWith('../components') && !importPath.startsWith('../hooks') && !importPath.startsWith('../utils') && !importPath.startsWith('../modals')) {
                    changed = true;
                    return `from '../${importPath}'`;
                }
                return match;
            });

            if (changed) {
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

fixImports(path.join(base, 'components'));
fixImports(path.join(base, 'hooks'));
fixImports(path.join(base, 'utils'));
fixImports(path.join(base, 'modals'));

console.log('Done!');
