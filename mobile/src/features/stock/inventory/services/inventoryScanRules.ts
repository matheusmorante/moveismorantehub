import type { AuditItem } from '../types/inventoryWorkflow.types';
import { extractLabelIdentity } from '../../../../utils/barcodeScannerUtils';

type ScanResult =
  | { kind: 'updated'; items: AuditItem[]; count: number }
  | { kind: 'duplicate' }
  | { kind: 'not_found' };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalizeLabelId = (labelId: string) => {
  const trimmed = labelId.trim();
  return UUID_REGEX.test(trimmed) ? trimmed.toLowerCase() : trimmed;
};

/** Uses the label's canonical ID, or the QR payload itself if it has no separate ID. */
export const getPhysicalInventoryScanId = (rawCode: string): string | undefined => {
  const raw = rawCode.trim();
  if (!raw || raw.toUpperCase().includes('000XXX')) return undefined;
  return extractLabelIdentity(raw).labelId || `qr:${raw}`;
};

/** Applies one physical-unit scan while enforcing label uniqueness in a draft. */
export const applyInventoryPhysicalScan = (
  items: AuditItem[],
  itemId: string,
  labelId?: string,
  scannedAt = new Date().toISOString(),
): ScanResult => {
  const item = items.find(candidate => candidate.id === itemId);
  if (!item) return { kind: 'not_found' };

  const normalizedLabelId = labelId ? normalizeLabelId(labelId) : undefined;
  if (normalizedLabelId && items.some(candidate =>
    candidate.countedLabelIds?.some(countedId => normalizeLabelId(countedId) === normalizedLabelId))) {
    return { kind: 'duplicate' };
  }

  const count = (item.physicalCount ?? 0) + 1;
  const nextItems = items.map(candidate => candidate.id === itemId
    ? {
      ...candidate,
      physicalCount: count,
      countedAt: scannedAt,
      countedLabelIds: normalizedLabelId
        ? [...(candidate.countedLabelIds || []), normalizedLabelId]
        : candidate.countedLabelIds,
    }
    : candidate);

  return { kind: 'updated', items: nextItems, count };
};
