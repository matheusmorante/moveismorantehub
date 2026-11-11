import { supabase } from '@/pages/utils/supabaseConfig';
import { sumInventoryCountedQuantities } from '../../../../../../../shared-utils/inventorySupplierStages';
import type { InventoryAuditSession, InventorySnapshotItem } from '../types/inventoryAudit.types';
import type { WebInventoryDraft } from './inventoryLocalDrafts';

export type InventoryAuditSessionPageEntry =
  | { readonly kind: 'local'; readonly id: string }
  | { readonly kind: 'remote'; readonly session: InventoryAuditSession };

export interface InventoryAuditSessionPage {
  readonly entries: readonly InventoryAuditSessionPageEntry[];
  readonly totalItems: number;
  readonly reservedCodes: readonly string[];
}

interface RpcLocalEntry {
  readonly kind: 'local';
  readonly id: string;
}

interface RpcRemoteEntry {
  readonly kind: 'remote';
  readonly id: string;
  readonly markerMoveId: string;
  readonly date: string;
  readonly status: string;
  readonly inventoryCode: string;
  readonly items: unknown;
  readonly name?: string | null;
  readonly hasStages?: boolean | null;
  readonly responsibleId?: string | null;
  readonly responsibleName?: string | null;
  readonly adjustmentsCount: number;
  readonly reversedCount: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const mapWebInventoryDraftToSession = (
  draft: WebInventoryDraft
): InventoryAuditSession => ({
  id: draft.id,
  inventoryCode: draft.code,
  date: draft.date,
  status: draft.status === 'pending_sync' ? 'pending' : 'in_progress',
  items: draft.items,
  productsCount: draft.items.filter((item) => item.physicalCount !== null).length,
  countedQuantityTotal: sumInventoryCountedQuantities(draft.items),
  adjustmentsCount: 0,
  reversedCount: 0,
  hasStages: draft.hasStages,
  responsibleId: draft.responsibleId,
  responsibleName: draft.responsibleName,
});

const mapRpcEntry = (value: unknown): InventoryAuditSessionPageEntry => {
  if (!isRecord(value)) throw new Error('O servidor retornou uma linha de inventário inválida.');

  if (value.kind === 'local' && typeof value.id === 'string' && value.id) {
    return { kind: 'local', id: value.id } satisfies RpcLocalEntry;
  }

  if (value.kind !== 'remote' || typeof value.id !== 'string' || !value.id) {
    throw new Error('O servidor retornou uma sessão de inventário inválida.');
  }

  const row = value as unknown as RpcRemoteEntry;
  const items = Array.isArray(row.items) ? (row.items as InventorySnapshotItem[]) : [];
  const status: InventoryAuditSession['status'] =
    typeof row.status === 'string' ? (row.status as InventoryAuditSession['status']) : 'completed';

  return {
    kind: 'remote',
    session: {
      id: row.id,
      inventoryCode: typeof row.inventoryCode === 'string' ? row.inventoryCode : '',
      date: typeof row.date === 'string' ? row.date : '',
      status,
      items,
      productsCount: items.filter((item) => typeof item.physicalCount === 'number').length,
      countedQuantityTotal: sumInventoryCountedQuantities(items),
      adjustmentsCount: Number.isFinite(Number(row.adjustmentsCount))
        ? Number(row.adjustmentsCount)
        : 0,
      reversedCount: Number.isFinite(Number(row.reversedCount)) ? Number(row.reversedCount) : 0,
      markerMoveId: typeof row.markerMoveId === 'string' ? row.markerMoveId : undefined,
      name: typeof row.name === 'string' ? row.name : undefined,
      hasStages: typeof row.hasStages === 'boolean' ? row.hasStages : undefined,
      responsibleId: typeof row.responsibleId === 'string' ? row.responsibleId : undefined,
      responsibleName:
        typeof row.responsibleName === 'string' ? row.responsibleName : undefined,
    },
  };
};

export const fetchInventoryAuditSessionPage = async (args: {
  readonly page: number;
  readonly periodStart: string | null;
  readonly localDrafts: readonly WebInventoryDraft[];
  readonly signal: AbortSignal;
}): Promise<InventoryAuditSessionPage> => {
  const { data, error } = await supabase
    .rpc('list_inventory_audit_sessions', {
      p_page: args.page,
      p_period_start: args.periodStart,
      p_local_drafts: args.localDrafts.map((draft) => ({ id: draft.id, draft_date: draft.date })),
    })
    .abortSignal(args.signal);

  if (error) throw error;
  if (!isRecord(data) || !Array.isArray(data.rows)) {
    throw new Error('O servidor não retornou a página de inventários esperada.');
  }

  const totalItems = Number(data.totalItems);
  if (!Number.isInteger(totalItems) || totalItems < 0) {
    throw new Error('O servidor retornou uma contagem de inventários inválida.');
  }

  return {
    entries: data.rows.map(mapRpcEntry),
    totalItems,
    reservedCodes: Array.isArray(data.reservedCodes)
      ? data.reservedCodes.filter((code): code is string => typeof code === 'string')
      : [],
  };
};
