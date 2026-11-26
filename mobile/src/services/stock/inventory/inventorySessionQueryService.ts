import { supabase } from '../../supabaseClient';
import { ITEMS_PER_PAGE, getStockPeriod } from '../stockMovesService';
import { offlineStorageService } from '../../offline/offlineStorageService';
import { getLocalInventoryDraft } from '../../sqlite/inventoryDrafts';
import { getInventorySubmission } from '../../sqlite/inventoryOutbox';
import { connectivityService } from '../../offline/connectivityService';
import { withTimeout } from '../../../../../shared-utils/core/withTimeout';
import {
  extractSessionCodesFromMarkers,
  groupAdjustmentsBySession,
  mapInventorySessionMarker,
  markDetailsAsStaleLocalSnapshot,
  parseJsonObservationSafe,
  type InventoryAdjustmentMoveRow,
  type InventoryMarkerMoveRow,
  type InventorySessionSummary,
} from './inventorySessionMarkers';

export const INVENTORY_SESSIONS_CACHE_KEY = 'inventory_sessions_cache_v1';
export const INVENTORY_SESSION_DETAILS_CACHE_KEY = 'inventory_session_details_cache_v1';

interface RpcResult<T> {
  data: T | null;
  error: { message?: string; code?: string } | null;
}

const getUserScopedCacheKey = (baseKey: string, userId?: string | null) =>
  userId ? `${baseKey}:${userId}` : null;

export interface InventorySessionsFetchResult {
  sessions: InventorySessionSummary[];
  fromCache: boolean;
}

const readCachedSessionsForFirstPage = async (
  page: number,
  cacheKeys: readonly string[]
): Promise<InventorySessionSummary[] | undefined> => {
  if (page !== 0) return undefined;
  for (const cacheKey of cacheKeys) {
    try {
      const cached = await offlineStorageService.getWorkingSet<InventorySessionSummary[]>(cacheKey);
      if (Array.isArray(cached?.data)) return cached.data;
    } catch (error) {
      console.warn(`Falha ao ler cache local de sessões (${cacheKey}):`, error);
    }
  }
  return undefined;
};

const cacheSessionDetailsLocally = async (
  detailsCacheKey: string | null,
  markerMoves: readonly InventoryMarkerMoveRow[]
): Promise<void> => {
  if (!detailsCacheKey) return;
  try {
    const existingDetails =
      (
        await offlineStorageService.getWorkingSet<Record<string, Record<string, unknown>>>(
          detailsCacheKey
        )
      )?.data || {};
    const nextDetails: Record<string, Record<string, unknown>> = { ...existingDetails };
    for (const move of markerMoves) {
      if (move.id && move.observation) {
        const parsed = parseJsonObservationSafe(move.observation, `cache-details:${move.id}`);
        if (parsed) nextDetails[move.id] = parsed;
      }
    }
    await offlineStorageService.cacheWorkingSet(detailsCacheKey, nextDetails);
  } catch (error) {
    console.warn('Falha ao atualizar cache local de detalhes do inventário:', error);
  }
};

export const fetchInventorySessionsWithStatus = async (
  page: number,
  startDate?: string,
  endDate?: string,
  userId?: string | null,
  periodDays = 0
): Promise<InventorySessionsFetchResult> => {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  const period = getStockPeriod(startDate, endDate);
  const sessionsCacheKey = getUserScopedCacheKey(
    periodDays > 0
      ? `${INVENTORY_SESSIONS_CACHE_KEY}:${periodDays}d`
      : INVENTORY_SESSIONS_CACHE_KEY,
    userId
  );
  const legacySessionsCacheKey =
    periodDays > 0 ? getUserScopedCacheKey(INVENTORY_SESSIONS_CACHE_KEY, userId) : null;
  const detailsCacheKey = getUserScopedCacheKey(INVENTORY_SESSION_DETAILS_CACHE_KEY, userId);
  const cacheKeys = [sessionsCacheKey, legacySessionsCacheKey].filter(
    (key): key is string => Boolean(key)
  );

  if (!connectivityService.connected) {
    const cached = await readCachedSessionsForFirstPage(page, cacheKeys);
    return { sessions: cached || [], fromCache: cached !== undefined };
  }

  try {
    let query = supabase
      .from('inventory_moves')
      .select('id, label, observation, quantity, date, created_at')
      .ilike('label', 'Inventário #%')
      .order('created_at', { ascending: false })
      .order('date', { ascending: false });

    if (period.start || period.end) {
      const createdAtBounds = [
        period.start ? `created_at.gte.${period.start}` : undefined,
        period.end ? `created_at.lte.${period.end}` : undefined,
      ].filter((condition): condition is string => Boolean(condition));
      const legacyDateBounds = [
        'created_at.is.null',
        period.start ? `date.gte.${period.start}` : undefined,
        period.end ? `date.lte.${period.end}` : undefined,
      ].filter((condition): condition is string => Boolean(condition));
      const createdAtFilter =
        createdAtBounds.length === 1
          ? createdAtBounds[0]
          : `and(${createdAtBounds.join(',')})`;
      query = query.or(`${createdAtFilter},and(${legacyDateBounds.join(',')})`);
    }

    const { data: markerMoves, error } = await query.range(from, to);
    if (error) throw error;
    if (!markerMoves || markerMoves.length === 0) {
      return { sessions: [], fromCache: false };
    }

    const typedMarkers = markerMoves as InventoryMarkerMoveRow[];
    await cacheSessionDetailsLocally(detailsCacheKey, typedMarkers);

    const sessionCodes = extractSessionCodesFromMarkers(typedMarkers);
    let adjustmentsData: InventoryAdjustmentMoveRow[] = [];
    if (sessionCodes.length > 0) {
      const expectedLabels = sessionCodes.map((code) => `Ajuste lançado pelo inventário #${code}`);
      const { data, error: adjustmentsError } = await supabase
        .from('inventory_moves')
        .select('id, label, observation, product_id')
        .in('label', expectedLabels);

      if (adjustmentsError) {
        console.warn('Erro ao buscar ajustes dos inventários:', adjustmentsError);
      } else {
        adjustmentsData = (data || []) as InventoryAdjustmentMoveRow[];
      }
    }

    const adjustmentsBySession = groupAdjustmentsBySession(adjustmentsData);
    const mappedSessions = typedMarkers
      .map((move) => mapInventorySessionMarker(move, adjustmentsBySession))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (page === 0 && sessionsCacheKey) {
      await offlineStorageService
        .cacheWorkingSet(sessionsCacheKey, mappedSessions)
        .catch((cacheError: unknown) => {
          console.warn('Falha ao salvar lista de sessões de inventário em cache:', cacheError);
        });
    }

    return { sessions: mappedSessions, fromCache: false };
  } catch (error) {
    console.warn('Erro ao buscar auditorias de inventário (usando fallback offline):', error);
    const cached = await readCachedSessionsForFirstPage(page, cacheKeys);
    return { sessions: cached || [], fromCache: cached !== undefined };
  }
};

export const fetchInventorySessions = async (
  page: number,
  startDate?: string,
  endDate?: string,
  userId?: string | null,
  periodDays = 0
): Promise<InventorySessionSummary[]> => {
  const result = await fetchInventorySessionsWithStatus(
    page,
    startDate,
    endDate,
    userId,
    periodDays
  );
  return result.sessions;
};

export const getNextInventoryCode = async (
  reservedCodes: readonly string[] = []
): Promise<string> => {
  const response = await withTimeout<RpcResult<string> | null>(
    Promise.resolve(
      supabase.rpc('reserve_next_inventory_code', { p_reserved_codes: [...reservedCodes] })
    ) as Promise<RpcResult<string>>,
    5_000,
    null,
    'inventory:next-code'
  );
  if (!response) throw new Error('A consulta do próximo código de inventário excedeu 5000ms.');

  const { data, error } = response;
  if (error) throw error;
  if (typeof data !== 'string' || !data) {
    throw new Error('O servidor não retornou um código de inventário reservado.');
  }
  return data;
};

export const getNextInventoryCodes = async (
  reservedCodes: readonly string[],
  count: number
): Promise<string[]> => {
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    throw new Error('A quantidade de códigos deve ficar entre 1 e 1.000.');
  }
  if (reservedCodes.length > 1000) {
    throw new Error('A lista de códigos reservados excede o limite de 1.000.');
  }

  const response = await withTimeout<RpcResult<string[]> | null>(
    Promise.resolve(
      supabase.rpc('reserve_next_inventory_codes', {
        p_reserved_codes: [...reservedCodes],
        p_count: count,
      })
    ) as Promise<RpcResult<string[]>>,
    5_000,
    null,
    'inventory:next-codes'
  );
  if (!response) throw new Error('A reserva em lote excedeu 5000ms.');

  const { data, error } = response;
  if (error) throw error;
  if (
    !Array.isArray(data) ||
    data.length !== count ||
    data.some((code) => typeof code !== 'string' || !/^\d{6}$/.test(code)) ||
    new Set(data).size !== count
  ) {
    throw new Error('O servidor não retornou a quantidade esperada de códigos distintos.');
  }
  return data;
};

export const fetchInventorySessionDetails = async (
  sessionId: string,
  userId?: string | null
): Promise<Record<string, unknown>> => {
  const detailsCacheKey = getUserScopedCacheKey(INVENTORY_SESSION_DETAILS_CACHE_KEY, userId);

  const readCachedDetails = async (): Promise<Record<string, unknown> | undefined> => {
    if (!detailsCacheKey) return undefined;
    try {
      const cachedDetails = await offlineStorageService.getWorkingSet<
        Record<string, Record<string, unknown>>
      >(detailsCacheKey);
      return cachedDetails?.data?.[sessionId];
    } catch (error) {
      console.warn(`Falha ao ler cache local de detalhes (${sessionId}):`, error);
      return undefined;
    }
  };

  // 1. Verificar primeiro se é um rascunho ou submissão congelada no SQLite local
  try {
    const localDraft = await getLocalInventoryDraft(sessionId, userId);
    if (localDraft) {
      return {
        inventoryAudit: true,
        inventoryCode: localDraft.code,
        name: localDraft.name,
        status: localDraft.status || 'in_progress',
        hasStages: localDraft.hasStages,
        scopeType: localDraft.scopeType,
        supplierId: localDraft.supplierId,
        responsibleId: localDraft.responsibleId,
        items: localDraft.items,
      };
    }
  } catch (error) {
    console.warn(`Falha ao ler rascunho local do inventário (${sessionId}):`, error);
  }

  try {
    const localSubmission = await getInventorySubmission(sessionId, userId);
    if (localSubmission?.observation) {
      return localSubmission.observation;
    }
  } catch (error) {
    console.warn(`Falha ao ler submissão local pendente (${sessionId}):`, error);
  }

  // 2. Se o aparelho confirmou que está offline, evitar uma tentativa remota
  // quando já existe uma cópia deste operador marcados como stale local.
  if (connectivityService.explicitlyOffline) {
    const cachedDetails = await readCachedDetails();
    if (cachedDetails) return markDetailsAsStaleLocalSnapshot(cachedDetails);
  }

  // 3. Tentar buscar no Supabase; conexão desconhecida/online mantém leitura atual
  try {
    const { data, error } = await supabase
      .from('inventory_moves')
      .select('observation')
      .eq('id', sessionId)
      .single();
    if (!error && data) {
      return parseJsonObservationSafe(data.observation, `remote-details:${sessionId}`) ?? {};
    }
  } catch (error) {
    console.warn(`Falha ao consultar detalhes remotos do inventário (${sessionId}):`, error);
  }

  // 4. Fallback no cache local de sessões sincronizadas, também identificado.
  const cachedDetails = await readCachedDetails();
  if (cachedDetails) return markDetailsAsStaleLocalSnapshot(cachedDetails);

  throw new Error('Não foi possível carregar os detalhes desta sessão de inventário.');
};
