import { chromium } from 'playwright';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'morante-inventory-e2e-'));
const url = 'http://127.0.0.1:4177/';
let context;

try {
  context = await chromium.launchPersistentContext(profile, { headless: true });
  let page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const { saveWebInventoryDraft } = await import('/src/pages/App/Stock/Inventory/services/inventoryLocalDrafts.ts');
    await saveWebInventoryDraft({
      id: 'inventory-browser-e2e', code: 'E2E_BROWSER', date: new Date().toISOString(),
      name: 'Teste de retomada', responsibleId: 'test', hasStages: true,
      status: 'in_progress', updatedAt: new Date().toISOString(),
      items: [{ id: 'item-1', productId: 'product-1', assignedSupplier: 'Telasul',
        name: 'Produto de teste', sku: 'E2E-SKU', physicalCount: 30 }],
      scannedLabelIds: ['label-1'],
    });
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  const afterReload = await page.evaluate(async () => {
    const { getWebInventoryDraft } = await import('/src/pages/App/Stock/Inventory/services/inventoryLocalDrafts.ts');
    return getWebInventoryDraft('inventory-browser-e2e');
  });
  if (afterReload?.items[0]?.physicalCount !== 30 || afterReload?.status !== 'in_progress') {
    throw new Error('Contagem perdida após F5');
  }

  await context.close();
  context = await chromium.launchPersistentContext(profile, { headless: true });
  page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const afterReopen = await page.evaluate(async () => {
    const { getWebInventoryDraft } = await import('/src/pages/App/Stock/Inventory/services/inventoryLocalDrafts.ts');
    return getWebInventoryDraft('inventory-browser-e2e');
  });
  if (afterReopen?.items[0]?.physicalCount !== 30 || afterReopen?.scannedLabelIds?.[0] !== 'label-1') {
    throw new Error('Contagem perdida após fechar e reabrir o navegador');
  }
  console.log('Inventário local preservado após F5 e reinício do navegador.');
} finally {
  if (context) await context.close().catch(() => {});
  if (resolve(dirname(profile)) === resolve(tmpdir()) && basename(profile).startsWith('morante-inventory-e2e-')) {
    await rm(profile, { recursive: true, force: true });
  }
}
