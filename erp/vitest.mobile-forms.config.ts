import path from 'node:path';
export default {
  resolve: { alias: [
    { find: /^expo-document-picker$/, replacement: path.resolve(__dirname, '../mobile/node_modules/expo-document-picker/build/index.js') },
    { find: /^react-native-safe-area-context$/, replacement: path.resolve(__dirname, '../mobile/node_modules/react-native-safe-area-context/lib/module/index.js') },
    { find: /^vitest$/, replacement: path.resolve(__dirname, './node_modules/vitest/dist/index.js') },
    { find: /^react-hook-form$/, replacement: path.resolve(__dirname, './node_modules/react-hook-form/dist/index.esm.mjs') },
    { find: /^react-native$/, replacement: path.resolve(__dirname, '../mobile/node_modules/react-native/index.js') },
    { find: /^lucide-react-native$/, replacement: path.resolve(__dirname, '../mobile/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js') },
    { find: /^react$/, replacement: path.resolve(__dirname, './node_modules/react') },
    { find: /^react\/jsx-runtime$/, replacement: path.resolve(__dirname, './node_modules/react/jsx-runtime.js') },
    { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(__dirname, './node_modules/react/jsx-dev-runtime.js') },
    { find: /^react-dom$/, replacement: path.resolve(__dirname, './node_modules/react-dom') },
  ] },
  test: { include: ['tests/mobile-forms/owners.test.tsx'], environment: 'happy-dom', clearMocks: true },
};

