import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { getLocalInventoryCatalogSnapshot, saveLocalInventoryCatalogSnapshot } from './inventoryCatalog';
import { getLocalInventoryDraft, saveLocalInventoryDraft } from './inventoryDrafts';
import { freezeInventorySubmission, getInventorySubmission, deleteInventorySubmission } from './inventoryOutbox';
import { getSQLiteDatabase, shouldUseInMemoryDatabase } from './database';

describe('persistência local do catálogo de inventário', () => {
  it('usa SQLite nativo no Android de produção', () => {
    expect(shouldUseInMemoryDatabase('android', 'production')).toBe(false);
    expect(shouldUseInMemoryDatabase('web', 'production')).toBe(true);
  });

  it('grava e recupera produtos, variações e fornecedores no banco local', async () => {
    const snapshot = {
      products: { 'product-1': { id: 'product-1', name: 'Mesa' } },
      variations: { 'variation-1': { id: 'variation-1', product_id: 'product-1' } },
      labels: {},
      suppliers: { 'supplier-1': { id: 'supplier-1', full_name: 'Fábrica São José' } },
      cursors: {}, syncedAt: '2026-09-25T12:00:00.000Z',
    };

    await saveLocalInventoryCatalogSnapshot(snapshot);
    expect(await getLocalInventoryCatalogSnapshot()).toEqual(snapshot);
  });

  it('reconstrói o índice sem tocar nas contagens e na submissão congelada', async () => {
    await deleteInventorySubmission('audit-cache');
    await saveLocalInventoryDraft({ id: 'audit-cache', code: 'LOCAL-1', name: 'Contagem', supplierId: 'supplier-1',
      items: [{ id: 'item-1', key: 'product-1-variation-1', productId: 'product-1', variationId: 'variation-1',
        name: 'Mesa', supplierNames: '', assignedSupplier: '', systemStock: 4, physicalCount: 3, unit: 'UN' }] });
    await freezeInventorySubmission({ contractVersion: 1, auditId: 'audit-cache', code: 'LOCAL-1',
      observation: { status: 'completed' }, items: [{ physicalCount: 3 }], responsibleName: 'Operador' });
    await saveLocalInventoryCatalogSnapshot({ products: {}, variations: {}, labels: {}, suppliers: {}, cursors: {},
      syncedAt: '2026-09-25T13:00:00Z', formatVersion: 2 });
    expect((await getLocalInventoryDraft('audit-cache'))?.items[0].physicalCount).toBe(3);
    expect((await getLocalInventoryDraft('audit-cache'))?.supplierId).toBe('supplier-1');
    expect((await getInventorySubmission('audit-cache'))?.items[0].physicalCount).toBe(3);
  });

  it('preserva e recupera o índice antigo quando o novo estiver inválido', async () => {
    const db = await getSQLiteDatabase();
    await db.runAsync('DELETE FROM inventory_catalog_local WHERE id = ?;', ['inventory-identification-index-v2']);
    const legacy = { products: { antigo: { id: 'antigo' } }, variations: {}, labels: {}, suppliers: {}, cursors: {}, syncedAt: null };
    await db.runAsync('INSERT INTO inventory_catalog_local (id, snapshot_json, updated_at) VALUES (?, ?, ?);',
      ['inventory-identification-index', JSON.stringify(legacy), '2026-09-25T12:00:00Z']);
    await db.runAsync('INSERT INTO inventory_catalog_local (id, snapshot_json, updated_at) VALUES (?, ?, ?);',
      ['inventory-identification-index-v2', '{invalid', '2026-09-25T12:00:00Z']);

    expect(await getLocalInventoryCatalogSnapshot()).toEqual(legacy);
  });
});
