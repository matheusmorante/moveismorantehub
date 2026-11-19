const { build } = require('esbuild');
const { resolve } = require('node:path');
const { mkdir, writeFile } = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

async function buildCustomerSupportApi() {
  const root = resolve(__dirname, '../..');
  const output = resolve(root, 'erp/server/customer-support');
  const options = { bundle: true, platform: 'node', format: 'cjs', target: 'node24', packages: 'external' };
  // Keep the shared processor inside one explicit CJS boundary, as in the fiscal build.
  // Vercel otherwise compiles shared-utils and the ERP under different package types.
  await build({ ...options,
    entryPoints: [resolve(root, 'erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts')],
    outfile: resolve(output, 'whatsapp-processor.cjs'),
  });
  await writeFile(resolve(output, 'whatsapp-processor.d.cts'),
    "import type * as Processor from '../../src/pages/utils/customerSupport/whatsappWebhookProcessor.js';\n" +
    'declare const processor: typeof Processor;\nexport default processor;\n');
  await build({ ...options,
    entryPoints: [resolve(root, 'erp/api/whatsapp-webhook.ts')],
    outfile: resolve(output, 'whatsapp-webhook.cjs'),
  });
  await build({ ...options,
    entryPoints: [resolve(root, 'api/whatsapp-dispatch.ts')],
    outfile: resolve(output, 'whatsapp-dispatch.cjs'),
  });
  const secureApiOutput = resolve(root, 'erp/server/secure-api');
  await mkdir(secureApiOutput, { recursive: true });
  const secureIntegrationsBundle = resolve(secureApiOutput, 'secure-integrations.cjs');
  await build({ ...options, external: ['zod'],
    entryPoints: [resolve(root, 'erp/api/_lib/secureIntegrations/handler.ts')],
    outfile: secureIntegrationsBundle,
  });
  const { default: secureIntegrations } = await import(pathToFileURL(secureIntegrationsBundle).href);
  if (typeof secureIntegrations.default !== 'function') {
    throw new Error('Secure integrations could not load in native Node.');
  }
}

module.exports = { buildCustomerSupportApi };
if (require.main === module) buildCustomerSupportApi().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
