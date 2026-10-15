import path from 'node:path';
export default {
  esbuild: { jsx: 'automatic' },
  resolve: { alias: [
    { find: /^@\//, replacement: path.resolve(__dirname, '../digital-catalog/src') + '/' },
    { find: /^next\/navigation$/, replacement: path.resolve(__dirname, '../digital-catalog/node_modules/next/navigation.js') },
    { find: /^next\/link$/, replacement: path.resolve(__dirname, '../digital-catalog/node_modules/next/link.js') },
    { find: /^sonner$/, replacement: path.resolve(__dirname, '../digital-catalog/node_modules/sonner/dist/index.mjs') },
    { find: /^lucide-react$/, replacement: path.resolve(__dirname, './node_modules/lucide-react/dist/cjs/lucide-react.js') },
    { find: /^react-hook-form$/, replacement: path.resolve(__dirname, './node_modules/react-hook-form/dist/index.esm.mjs') },
    { find: /^react$/, replacement: path.resolve(__dirname, './node_modules/react') },
    { find: /^react\/jsx-runtime$/, replacement: path.resolve(__dirname, './node_modules/react/jsx-runtime.js') },
    { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(__dirname, './node_modules/react/jsx-dev-runtime.js') },
    { find: /^react-dom$/, replacement: path.resolve(__dirname, './node_modules/react-dom') },
  ] },
  test: { include: ['tests/catalog-forms/**/*.test.tsx'], environment: 'happy-dom', clearMocks: true, restoreMocks: true },
};
