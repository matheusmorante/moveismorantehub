const { build } = require('esbuild');
const { resolve } = require('node:path');
const { mkdir, writeFile } = require('node:fs/promises');

const root = resolve(__dirname, '../..');
const outdir = resolve(root, 'erp/server/nfe');
const routes = ['emit', 'consult', 'document-details', 'item-defaults', 'cancel', 'return-capacity',
  'operation-drafts', 'transmit-operation-draft', 'cce', 'reserve-number', 'order-cancellation-policy',
  'order-fiscal-badges', 'inbound-manifestation'];

async function main() {
  // Bundle only our fiscal source graph. Explicit .cjs files create a stable
  // Node boundary regardless of the ERP's ESM TypeScript compiler settings.
  // External packages keep their own module metadata and native/WASM assets.
  await build({
    absWorkingDir: root,
    entryPoints: Object.fromEntries(routes.map((name) => [name, `api/nfe/${name}.ts`])),
    outdir,
    outExtension: { '.js': '.cjs' },
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    packages: 'external',
    sourcemap: true,
    logLevel: 'warning',
  });
  await mkdir(outdir, { recursive: true });
  for (const route of routes) {
    await writeFile(resolve(outdir, `${route}.d.cts`),
      "import type { VercelRequest, VercelResponse } from '@vercel/node';\n" +
      'declare const handler: (req: VercelRequest, res: VercelResponse) => Promise<unknown>;\n' +
      'export default handler;\n');
  }
  console.log(`Fiscal backend bundled: ${routes.join(', ')}.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
