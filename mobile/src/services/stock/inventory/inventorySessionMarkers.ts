import { sumInventoryCountedQuantities } from '../../../../../shared-utils/inventorySupplierStages';

export interface InventoryMarkerMoveRow {
  id: string;
  label?: string | null;
  observation?: string | null;
  quantity?: number | null;
  date?: string | null;
  created_at?: string | null;
}

export interface InventoryAdjustmentMoveRow {
  id?: string;
  label?: string | null;
  observation?: string | null;
  product_id?: string | null;
  status?: string | null;
}

export interface InventoryAdjustmentSummary {
  total: number;
  reversed: number;
}

export interface InventorySessionSummary {
  id: string;
  name: string;
  inventoryCode: string;
  responsibleName: string;
  status: 'in_progress' | 'completed' | 'pending';
  created_at: string;
  updated_at: string;
  items_count: number;
  productsCount: number;
  countedQuantityTotal?: number;
  adjustmentsCount: number;
  reversedCount: number;
}

interface ParsedMarkerObservation {
  inventoryCode?: unknown;
  responsibleName?: unknown;
  name?: unknown;
  inventoryAudit?: unknown;
  items?: Array<{ physicalCount?: number | null } & Record<string, unknown>>;
  status?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const parseJsonObservationSafe = (
  raw: string | null | undefined,
  context: string
): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    console.warn(`Falha ao ler JSON de observação em ${context}:`, error);
    return null;
  }
};

export const extractSessionCodesFromMarkers = (
  markerMoves: readonly InventoryMarkerMoveRow[]
): string[] =>
  markerMoves
    .map((move) => {
      const data = parseJsonObservationSafe(move.observation, `marker:${move.id}`);
      if (typeof data?.inventoryCode === 'string' && data.inventoryCode) {
        return data.inventoryCode;
      }
      return move.label?.replace('Inventário #', '') || '';
    })
    .filter(Boolean);

export const groupAdjustmentsBySession = (
  adjustmentsData: readonly InventoryAdjustmentMoveRow[]
): Record<string, InventoryAdjustmentSummary> =>
  adjustmentsData.reduce<Record<string, InventoryAdjustmentSummary>>((acc, move) => {
    const match = move.label?.match(/Ajuste lançado pelo inventário #(.+)/);
    if (match && match[1]) {
      const code = match[1].trim();
      if (!acc[code]) acc[code] = { total: 0, reversed: 0 };
      acc[code].total += 1;

      const parsedObservation =
        move.status === 'reversed'
          ? null
          : parseJsonObservationSafe(move.observation, `adjustment:${move.id || code}`);
      const isReversed =
        move.status === 'reversed' || parsedObservation?.status === 'reversed';
      if (isReversed) {
        acc[code].reversed += 1;
      }
    }
    return acc;
  }, {});

export const mapInventorySessionMarker = (
  move: InventoryMarkerMoveRow,
  adjustmentsBySession: Record<string, InventoryAdjustmentSummary>
): InventorySessionSummary => {
  let productsCount = 0;
  let countedQuantityTotal: number | undefined;
  let status = 'in_progress';
  let inventoryCode = move.id.split('-')[0];
  let responsibleName = 'Não informado';
  let sessionName = '';

  const parsed = parseJsonObservationSafe(move.observation, `session:${move.id}`) as
    | ParsedMarkerObservation
    | null;

  if (parsed) {
    inventoryCode =
      (typeof parsed.inventoryCode === 'string' && parsed.inventoryCode) ||
      move.label?.replace('Inventário #', '') ||
      inventoryCode;
    responsibleName =
      typeof parsed.responsibleName === 'string' && parsed.responsibleName
        ? parsed.responsibleName
        : 'Não informado';
    if (typeof parsed.name === 'string' && parsed.name) {
      sessionName = parsed.name;
    }

    if (parsed.inventoryAudit && Array.isArray(parsed.items)) {
      const normalizedCounted = parsed.items
        .filter((item) => item?.physicalCount !== null && item?.physicalCount !== undefined)
        .map((item) => ({ physicalCount: Number(item.physicalCount) }));
      productsCount = normalizedCounted.length;
      countedQuantityTotal = sumInventoryCountedQuantities(normalizedCounted);
      status = typeof parsed.status === 'string' && parsed.status ? parsed.status : 'completed';
    } else {
      productsCount = Math.abs(move.quantity || 0);
    }
  } else {
    productsCount = Math.abs(move.quantity || 0);
    inventoryCode = move.label?.replace('Inventário #', '') || inventoryCode;
  }

  const sessionAdjustments = adjustmentsBySession[inventoryCode] || { total: 0, reversed: 0 };
  const timestamp = move.created_at || move.date || '';

  return {
    id: move.id,
    name: sessionName || `Inventário #${inventoryCode}`,
    inventoryCode,
    responsibleName,
    status: status as 'in_progress' | 'completed' | 'pending',
    created_at: timestamp,
    updated_at: timestamp,
    items_count: productsCount,
    productsCount,
    countedQuantityTotal,
    adjustmentsCount: sessionAdjustments.total,
    reversedCount: sessionAdjustments.reversed,
  };
};

export function markDetailsAsStaleLocalSnapshot<T>(details: T): T {
  return details && typeof details === 'object' && !Array.isArray(details)
    ? ({ ...details, isStaleLocalSnapshot: true } as T)
    : details;
}
