import { describe, expect, it } from 'vitest';
import { extractLabelIdentity } from '../../../../utils/barcodeScannerUtils';
import { applyInventoryPhysicalScan, getPhysicalInventoryScanId } from './inventoryScanRules';
import type { AuditItem } from '../types/inventoryWorkflow.types';

const item: AuditItem = {
  id: 'item-1', key: 'product-1-main', productId: 'product-1', name: 'Produto',
  supplierNames: 'Fornecedor', assignedSupplier: 'Fornecedor', systemStock: 0,
  physicalCount: null, unit: 'UN',
};

describe('inventory physical QR scan uniqueness', () => {
  it('uses scanId from JSON and counts the same physical QR only once', () => {
    const qr = JSON.stringify({ sku: 'SKU-1', scanId: 'unit-42' });
    const labelId = getPhysicalInventoryScanId(qr);
    expect(extractLabelIdentity(qr).labelId).toBe('unit-42');
    expect(labelId).toBe('unit-42');

    const first = applyInventoryPhysicalScan([item], item.id, labelId, '2026-09-25T12:00:00.000Z');
    expect(first.kind).toBe('updated');
    if (first.kind !== 'updated') throw new Error('Expected first scan to count.');
    expect(first.count).toBe(1);

    const second = applyInventoryPhysicalScan(first.items, item.id, labelId);
    expect(second).toEqual({ kind: 'duplicate' });
    expect(first.items[0].physicalCount).toBe(1);
  });

  it('treats a legacy pipe serial as the physical label identity', () => {
    expect(extractLabelIdentity('SKU-1|000042')).toEqual({ labelId: '000042', code: 'SKU-1' });
  });

  it('deduplicates a repeated QR payload without a separate label ID', () => {
    const firstId = getPhysicalInventoryScanId('SKU-1');
    expect(firstId).toBe('qr:SKU-1');

    const first = applyInventoryPhysicalScan([item], item.id, firstId);
    expect(first.kind).toBe('updated');
    if (first.kind !== 'updated') throw new Error('Expected QR scan to count.');

    expect(applyInventoryPhysicalScan(first.items, item.id, getPhysicalInventoryScanId('SKU-1')))
      .toEqual({ kind: 'duplicate' });
    expect(applyInventoryPhysicalScan(first.items, item.id, getPhysicalInventoryScanId('SKU-1|SERIAL-B')).kind)
      .toBe('updated');
  });

  it('uses simple QR text as a stable identity and skips preview placeholders', () => {
    expect(getPhysicalInventoryScanId('SKU-1')).toBe('qr:SKU-1');
    expect(getPhysicalInventoryScanId('MH:L:000XXX|SKU-1')).toBeUndefined();
  });

  it('allows another unique label for the same product and normalizes UUID casing', () => {
    const upper = applyInventoryPhysicalScan([item], item.id, 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA');
    expect(upper.kind).toBe('updated');
    if (upper.kind !== 'updated') throw new Error('Expected first label to count.');

    const replay = applyInventoryPhysicalScan(upper.items, item.id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(replay).toEqual({ kind: 'duplicate' });

    const other = applyInventoryPhysicalScan(upper.items, item.id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(other.kind).toBe('updated');
    if (other.kind === 'updated') expect(other.count).toBe(2);
  });
});
