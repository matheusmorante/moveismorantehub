/**
 * Primeira fatia de mutation testing: regras de produto e independência entre
 * ativação ERP e publicação no Catálogo Digital.
 */
export default {
  mutate: [
    'src/pages/utils/productKindRules.ts',
    'src/pages/App/Products/ProductList/utils/productActivationState.ts',
    'src/pages/App/Products/ProductList/utils/productCatalogState.ts',
    'src/pages/App/Products/ProductList/hooks/useProductsActivationValidation.ts',
  ],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
    related: false,
  },
  testFiles: [
    'src/pages/utils/productKindRules.test.ts',
    'src/pages/App/Products/ProductList/utils/productActivationState.test.ts',
    'src/pages/App/Products/ProductList/utils/productCatalogState.test.ts',
    'src/pages/App/Products/ProductList/hooks/useProductsActivePersistence.test.ts',
    'src/pages/App/Products/ProductList/hooks/useProductsActivationValidation.test.ts',
  ],
  coverageAnalysis: 'perTest',
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.stryker.json',
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/critical.html' },
  jsonReporter: { fileName: 'reports/mutation/critical.json' },
  concurrency: 2,
  cleanTempDir: 'always',
};
