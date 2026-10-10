const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { readdir, readFile, writeFile } = require('node:fs/promises');
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
  const routeDispatchers = {
    emit: 'operations',
    consult: 'operations',
    'inbound-manifestation': 'operations',
    cancel: 'operations',
    'return-capacity': 'operations',
    'operation-drafts': 'operations',
    'transmit-operation-draft': 'operations',
    cce: 'operations',
    'reserve-number': 'operations',
    'document-details': 'auxiliary',
    'item-defaults': 'auxiliary',
    'order-cancellation-policy': 'auxiliary',
    'order-fiscal-badges': 'auxiliary',
  };
  const config = JSON.parse(await readFile(resolve(__dirname, '../vercel.json'), 'utf8'));
  const rewrites = new Map(config.rewrites.map(({ source, destination }) => [source, destination]));
  for (const [route, dispatcher] of Object.entries(routeDispatchers)) {
    const expected = `/api/nfe/${dispatcher}?operation=${route}`;
    assert.equal(rewrites.get(`/api/nfe/${route}`), expected,
      `${route}: public path is not routed to its whitelisted handler`);
  }
  const countFunctions = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) count += await countFunctions(path);
      else if (/\.(?:c|m)?[jt]s$/.test(entry.name)) count += 1;
    }
    return count;
  };
  const functionCount = await countFunctions(resolve(__dirname, '../api'));
  assert.ok(functionCount <= 12, `Vercel Hobby limit exceeded: ${functionCount} API functions.`);
  console.log(`Vercel API functions: ${functionCount}/12.`);

  for (const [route, dispatcher] of Object.entries(routeDispatchers)) {
    const source = await readFile(resolve(__dirname, `../api/nfe/${dispatcher}.ts`), 'utf8');
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
  for (const dispatcher of ['operations', 'auxiliary']) {
    const source = await readFile(resolve(__dirname, `../api/nfe/${dispatcher}.ts`), 'utf8');
    const emitted = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const runnable = emitted.replace(/\.\.\/\.\.\/server\/nfe\/([\w-]+)\.cjs/g,
      (_, name) => pathToFileURL(resolve(__dirname, `../server/nfe/${name}.cjs`)).href);
    const { default: handler } = await import('data:text/javascript;base64,' +
      Buffer.from(runnable).toString('base64'));
    let status;
    const response = { status(code) { status = code; return this; }, json() { return this; } };
    await handler({ method: 'POST', headers: {}, query: { operation: '__proto__' } }, response);
    assert.equal(status, 404, `${dispatcher}: unknown operation was not rejected.`);
  }
  const auditRouteSource = await readFile(resolve(__dirname, '../api/nfe/audit-order-edit.ts'), 'utf8');
  const auditRouteEmitted = ts.transpileModule(auditRouteSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  assert.ok(auditRouteEmitted.includes('../../server/nfe/audit-order-edit.cjs'));
  const auditRouteRunnable = auditRouteEmitted.replace(
    '../../server/nfe/audit-order-edit.cjs',
    pathToFileURL(resolve(__dirname, '../server/nfe/audit-order-edit.cjs')).href
  );
  const { default: auditRoute } = await import('data:text/javascript;base64,' +
    Buffer.from(auditRouteRunnable).toString('base64'));
  let auditStatus;
  const auditResponse = {
    setHeader() {}, status(code) { auditStatus = code; return this; }, json() { return this; },
  };
  await auditRoute({ method: 'INVALID', headers: {}, query: {} }, auditResponse);
  assert.equal(auditStatus, 405, 'audit-order-edit: handler did not execute');
  console.log('audit-order-edit: native module loading and handler execution passed.');
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
