import { supabase } from '../../supabaseClient';
import { ITEMS_PER_PAGE, getStockPeriod } from '../stockMovesService';
import { offlineStorageService } from '../../offline/offlineStorageService';
import { getLocalInventoryDraft } from '../../sqlite/inventoryDrafts';
import { getInventorySubmission } from '../../sqlite/inventoryOutbox';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export const INVENTORY_SESSIONS_CACHE_KEY = 'inventory_sessions_cache_v1';
export const INVENTORY_SESSION_DETAILS_CACHE_KEY = 'inventory_session_details_cache_v1';

const getUserScopedCacheKey = (baseKey: string, userId?: string | null) =>
  userId ? `${baseKey}:${userId}` : null;

const extractSessionCodesFromMarkers = (markerMoves: any[]): string[] =>
  markerMoves
    .map((m) => {
      try {
        const data = JSON.parse(m.observation || '{}') as any;
        if (data.inventoryCode) return data.inventoryCode;
      } catch {}
      return m.label?.replace('Inventário #', '') || '';
    })
    .filter(Boolean);

const groupAdjustmentsBySession = (
  adjustmentsData: any[]
): Record<string, { total: number; reversed: number }> =>
  adjustmentsData.reduce((acc: Record<string, { total: number; reversed: number }>, move) => {
    const match = move.label?.match(/Ajuste lançado pelo inventário #(.+)/);
    if (match && match[1]) {
      const code = match[1].trim();
      if (!acc[code]) acc[code] = { total: 0, reversed: 0 };
      acc[code].total += 1;

      const isReversed =
        move.status === 'reversed' ||
        (() => {
          try {
            return JSON.parse(move.observation || '{}').status === 'reversed';
          } catch {
            return false;
          }
        })();
      if (isReversed) {
        acc[code].reversed += 1;
      }
    }
    return acc;
  }, {});

const mapInventorySessionMarker = (
  m: any,
  adjustmentsBySession: Record<string, { total: number; reversed: number }>
) => {
  let productsCount = 0;
  let status = 'in_progress';
  let inventoryCode = m.id.split('-')[0];
  let responsibleName = 'Não informado';
  let sessionName = '';

  try {
    const data = JSON.parse(m.observation || '{}') as any;
    inventoryCode =
      data.inventoryCode || m.label?.replace('Inventário #', '') || inventoryCode;
    responsibleName = data.responsibleName || 'Não informado';
    if (data.name) sessionName = data.name;

    if (data.inventoryAudit && Array.isArray(data.items)) {
      productsCount = data.items.length;
      status = data.status || 'completed';
    } else {
      productsCount = Math.abs(m.quantity || 0);
    }
  } catch {
    productsCount = Math.abs(m.quantity || 0);
    inventoryCode = m.label?.replace('Inventário #', '') || inventoryCode;
  }

  const sessionAdjustments = adjustmentsBySession[inventoryCode] || { total: 0, reversed: 0 };

  return {
    id: m.id,
    name: sessionName || `Inventário #${inventoryCode}`,
    inventoryCode,
    responsibleName,
    status: status as 'in_progress' | 'completed' | 'pending',
    created_at: m.created_at || m.date,
    updated_at: m.created_at || m.date,
    items_count: productsCount,
    productsCount,
    adjustmentsCount: sessionAdjustments.total,
    reversedCount: sessionAdjustments.reversed,
  };
};

export const fetchInventorySessions = async (
  page: number,
  startDate?: string,
  endDate?: string,
  userId?: string | null
) => {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  const period = getStockPeriod(startDate, endDate);
  const sessionsCacheKey = getUserScopedCacheKey(INVENTORY_SESSIONS_CACHE_KEY, userId);
  const detailsCacheKey = getUserScopedCacheKey(INVENTORY_SESSION_DETAILS_CACHE_KEY, userId);

  try {
    let query = supabase
      .from('inventory_moves')
      .select('id, label, observation, quantity, date, created_at')
      .ilike('label', 'Inventário #%')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (period.start) query = query.gte('created_at', period.start);
    if (period.end) query = query.lte('created_at', period.end);

    const { data: markerMoves, error } = await query;

    if (error) {
      throw error;
    }

    if (!markerMoves || markerMoves.length === 0) return [];

    // Cachear detalhes (observation) das sessões remotas para consulta/duplicação offline
    try {
      if (detailsCacheKey) {
        const existingDetails =
          (
            await offlineStorageService.getWorkingSet<Record<string, any>>(
              detailsCacheKey
            )
          )?.data || {};
        const nextDetails: Record<string, any> = { ...existingDetails };
        for (const m of markerMoves) {
          if (m.id && m.observation) {
            try {
              nextDetails[m.id] = JSON.parse(m.observation);
            } catch {}
          }
        }
        await offlineStorageService.cacheWorkingSet(detailsCacheKey, nextDetails);
      }
    } catch {}

    const sessionCodes = extractSessionCodesFromMarkers(markerMoves);

    let adjustmentsData: any[] = [];
    if (sessionCodes.length > 0) {
      const expectedLabels = sessionCodes.map((code) => `Ajuste lançado pelo inventário #${code}`);
      const { data, error: adjustmentsError } = await supabase
        .from('inventory_moves')
        .select('id, label, observation, product_id')
        .in('label', expectedLabels);

      if (adjustmentsError) {
        console.warn('Erro ao buscar ajustes dos inventários:', adjustmentsError);
      } else {
        adjustmentsData = data || [];
      }
    }

    const adjustmentsBySession = groupAdjustmentsBySession(adjustmentsData);

    const mappedSessions = markerMoves
      .map((m) => mapInventorySessionMarker(m, adjustmentsBySession))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (page === 0 && sessionsCacheKey) {
      await offlineStorageService
        .cacheWorkingSet(sessionsCacheKey, mappedSessions)
        .catch(() => {});
    }

    return mappedSessions;
  } catch (error) {
    console.warn('Erro ao buscar auditorias de inventário (usando fallback offline):', error);
    if (page === 0 && sessionsCacheKey) {
      try {
        const cached = await offlineStorageService.getWorkingSet<any[]>(
          sessionsCacheKey
        );
        if (Array.isArray(cached?.data)) {
          return cached.data;
        }
      } catch {}
    }
    return [];
  }
};

export const getNextInventoryCode = async (
  reservedCodes: readonly string[] = []
): Promise<string> => {
  const response = await withTimeout(
    Promise.resolve(
      supabase.rpc('reserve_next_inventory_code', { p_reserved_codes: [...reservedCodes] })
    ).then((result) => ({ result })),
    5_000,
    null as { result: { data: string | null; error: any } } | null,
    'inventory:next-code'
  );
  if (!response) throw new Error('A consulta do próximo código de inventário excedeu 5000ms.');
  const { data, error } = response.result;

  if (error) throw error;
  if (typeof data !== 'string' || !data) {
    throw new Error('O servidor não retornou um código de inventário reservado.');
  }
  return data;
};

export const fetchInventorySessionDetails = async (
  sessionId: string,
  userId?: string | null
) => {
  const detailsCacheKey = getUserScopedCacheKey(INVENTORY_SESSION_DETAILS_CACHE_KEY, userId);
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
  } catch {}

  try {
    const localSubmission = await getInventorySubmission(sessionId, userId);
    if (localSubmission?.observation) {
      return localSubmission.observation;
    }
  } catch {}

  // 2. Tentar buscar no Supabase
  try {
    const { data, error } = await supabase
      .from('inventory_moves')
      .select('observation')
      .eq('id', sessionId)
      .single();
    if (!error && data) {
      try {
        return JSON.parse(data.observation || '{}');
      } catch {
        return {};
      }
    }
  } catch {}

  // 3. Fallback no cache local de sessões sincronizadas
  try {
    if (detailsCacheKey) {
      const cachedDetails = await offlineStorageService.getWorkingSet<Record<string, any>>(
        detailsCacheKey
      );
      if (cachedDetails?.data?.[sessionId]) {
        return cachedDetails.data[sessionId];
      }
    }
  } catch {}

  throw new Error('Não foi possível carregar os detalhes desta sessão de inventário.');
};
