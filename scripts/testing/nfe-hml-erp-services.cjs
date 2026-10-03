// Run the ERP's actual persistence services with a normally authenticated client.
// Only browser cache and client construction are adapted for the Node runner.
const path = require('node:path');
const Module = require('node:module');
const { createRequire } = require('node:module');

async function loadErpServices(operator) {
  const root = path.resolve(__dirname, '..', '..');
  const erpRequire = createRequire(path.join(root, 'erp', 'package.json'));
  const { build } = erpRequire('esbuild');
  const result = await build({
    stdin: {
      contents: `
        export { setOperator } from '@/pages/utils/supabaseConfig';
        export { savePerson, updatePerson } from '@/pages/utils/personService/personMutationService';
        export { saveProduct } from '@/pages/utils/productService/productMutationService';
        export { buildOrderPersistencePayload } from '@/pages/utils/orderSnapshotResolution';
        export { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
      `,
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    alias: { '@': path.join(root, 'erp', 'src') },
    define: { 'import.meta.env': '{}' },
    logLevel: 'silent',
    plugins: [{
      name: 'authenticated-erp-client',
      setup(builder) {
        builder.onResolve({ filter: /(?:^|\/)supabaseConfig$/ }, () => ({
          path: 'operator-client', namespace: 'hml-runner',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'hml-runner' }, () => ({
          contents: 'export let supabase; export const setOperator = (client) => { supabase = client; };',
          loader: 'js',
        }));
      },
    }],
  });
  if (typeof globalThis.localStorage === 'undefined') {
    const cache = new Map();
    globalThis.localStorage = {
      getItem: (key) => cache.get(key) ?? null,
      setItem: (key, value) => cache.set(key, String(value)),
      removeItem: (key) => cache.delete(key),
    };
  }
  const filename = path.join(root, 'erp', '.nfe-hml-services.cjs');
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(result.outputFiles[0].text, filename);
  compiled.exports.setOperator(operator);
  return compiled.exports;
}

module.exports = { loadErpServices };
