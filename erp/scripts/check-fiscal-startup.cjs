const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { readFile, writeFile } = require('node:fs/promises');
const { build } = require('esbuild');
const ts = require('typescript');

async function check() {
  // Run in a clean Node process, using native ESM -> CJS loading as in Vercel.
  // No certificate, authenticated database call, or SEFAZ request is used.
  if (!process.argv.includes('--child')) {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (/^(NFE_|SUPABASE_SERVICE_ROLE_KEY$)/.test(key)) delete env[key];
    }
    const result = spawnSync(process.execPath, [__filename, '--child'], {
      cwd: resolve(__dirname, '..'), env, encoding: 'utf8', windowsHide: true,
    });
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    if (result.error) throw result.error;
    assert.equal(result.status, 0, 'Fiscal backend failed to start in native Node.');
    return;
  }
  const routes = ['emit', 'consult', 'document-details', 'item-defaults', 'cancel', 'return-capacity',
    'operation-drafts', 'transmit-operation-draft', 'cce', 'reserve-number', 'order-cancellation-policy',
    'order-fiscal-badges'];
  const directRoutes = ['emit', 'consult', 'document-details', 'item-defaults', 'order-cancellation-policy',
    'order-fiscal-badges'];
  for (const route of routes) {
    const dynamic = !directRoutes.includes(route);
    const source = await readFile(resolve(__dirname, `../api/nfe/${dynamic ? 'operations' : route}.ts`), 'utf8');
    const emitted = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    assert.ok(emitted.includes(`../../server/nfe/${route}.cjs`));
    const runnable = emitted.replace(/\.\.\/\.\.\/server\/nfe\/([\w-]+)\.cjs/g,
      (_, name) => pathToFileURL(resolve(__dirname, `../server/nfe/${name}.cjs`)).href);
    const { default: handler } = await import('data:text/javascript;base64,' +
      Buffer.from(runnable).toString('base64'));
    assert.equal(typeof handler, 'function', `${route}: invalid handler export`);
    let status;
    const response = {
      setHeader() {},
      status(code) { status = code; return this; },
      json(body) { assert.ok(body && typeof body === 'object'); return this; },
      end() { return this; },
    };
    await handler({ method: 'INVALID', headers: {}, query: { operation: route } }, response);
    assert.equal(status, 405, `${route}: handler did not execute`);
    console.log(`${route}: native module loading and handler execution passed.`);
  }
  // Exercise the external ESM/WASM dependency and XSD resource resolution.
  const result = await build({
    entryPoints: [resolve(__dirname, '../../api/nfe/schemaValidator.ts')],
    bundle: true, platform: 'node', target: 'node24', format: 'cjs',
    packages: 'external', write: false, logLevel: 'silent',
  });
  const schemaCheck = resolve(__dirname, '../server/nfe/schema-check.cjs');
  await writeFile(schemaCheck, result.outputFiles[0].text);
  const { default: validator } = await import(pathToFileURL(schemaCheck).href);
  await validator.validateUnsignedNfeStructure(
    '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe' +
    '1'.repeat(44) + '" versao="4.00"></infNFe></NFe>');
  await assert.rejects(validator.validateNfeAgainstOfficialSchema('<invalid/>'),
    /não passou pelo schema oficial/);
  console.log(`WASM loaded and official XSD resolved. Runtime: ${process.version}.`);
}

check().catch((error) => { console.error(error.message); process.exitCode = 1; });
