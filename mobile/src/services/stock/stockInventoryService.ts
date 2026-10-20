import { supabase } from '../supabaseClient';
import { ITEMS_PER_PAGE, getStockPeriod } from './stockMovesService';
import { connectivityService } from '../offline/connectivityService';
import { offlineStorageService } from '../offline/offlineStorageService';
import {
  deleteLocalInventoryDraft,
  getLocalInventoryDraft,
} from '../sqlite/inventoryDrafts';
import {
  deleteInventorySubmission,
  getInventorySubmission,
} from '../sqlite/inventoryOutbox';
import { deleteLocalInventoryScans } from '../sqlite/inventoryScans';
import {
  clearOfflineInventoryCatalogCache,
  ensureOfflineInventoryCatalogSynced,
  getOfflineInventoryCatalog,
  getOfflineInventoryScopeProducts,
} from '../../features/stock/inventory/services/offlineInventoryCatalog';

const INVENTORY_SESSIONS_CACHE_KEY = 'inventory_sessions_cache_v1';
const INVENTORY_SESSION_DETAILS_CACHE_KEY = 'inventory_session_details_cache_v1';

export const fetchInventoryScopeSuppliers = async () => {
  await ensureOfflineInventoryCatalogSynced();
  const catalog = await getOfflineInventoryCatalog();
  if (!catalog.syncedAt && Object.keys(catalog.suppliers).length === 0) {
    throw new Error(
      'O catálogo local ainda não foi sincronizado. Conecte-se à internet e tente novamente.'
    );
  }
  return Object.values(catalog.suppliers)
    .filter((supplier) => !supplier.deleted)
    .map((supplier) => ({
      id: supplier.id,
      full_name: supplier.social_name || supplier.full_name || supplier.nickname || '',
    }))
    .sort((left, right) => left.full_name.localeCompare(right.full_name));
};

export const fetchInventoryScopeProducts = async (
  _scope: 'full' | 'supplier',
  _supplierId?: string
) => {
  await ensureOfflineInventoryCatalogSynced();
  const products = await getOfflineInventoryScopeProducts();
  if (products.length === 0) {
    throw new Error(
      'Nenhum produto foi encontrado no catálogo local. Conecte-se à internet e tente novamente.'
    );
  }
  return products;
};

export const clearInventoryScopeCache = () => clearOfflineInventoryCatalogCache();

/**
 * Sessões de Inventário
 */
export const fetchInventorySessions = async (
  page: number,
  startDate?: string,
  endDate?: string
) => {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  const period = getStockPeriod(startDate, endDate);

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
      const existingDetails =
        (
          await offlineStorageService.getWorkingSet<Record<string, any>>(
            INVENTORY_SESSION_DETAILS_CACHE_KEY
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
      await offlineStorageService.cacheWorkingSet(INVENTORY_SESSION_DETAILS_CACHE_KEY, nextDetails);
    } catch {}

    const sessionCodes = markerMoves
      .map((m) => {
        try {
          const data = JSON.parse(m.observation || '{}') as any;
          if (data.inventoryCode) return data.inventoryCode;
        } catch {}
        return m.label?.replace('Inventário #', '') || '';
      })
      .filter(Boolean);

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

    const adjustmentsBySession = adjustmentsData.reduce(
      (acc: Record<string, { total: number; reversed: number }>, move) => {
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
      },
      {}
    );

    const mappedSessions = markerMoves
      .map((m) => {
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
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (page === 0) {
      await offlineStorageService
        .cacheWorkingSet(INVENTORY_SESSIONS_CACHE_KEY, mappedSessions)
        .catch(() => {});
    }

    return mappedSessions;
  } catch (error) {
    console.warn('Erro ao buscar auditorias de inventário (usando fallback offline):', error);
    if (page === 0) {
      try {
        const cached = await offlineStorageService.getWorkingSet<any[]>(
          INVENTORY_SESSIONS_CACHE_KEY
        );
        if (Array.isArray(cached?.data)) {
          return cached.data;
        }
      } catch {}
    }
    return [];
  }
};

export const getNextInventoryCode = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('inventory_moves')
    .select('observation')
    .ilike('label', 'Inventário #%')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  const lastCode = (data || []).reduce((highest, move: any) => {
    try {
      const obs = JSON.parse(move.observation || '{}');
      const codeNum = Number(obs.inventoryCode);
      return !isNaN(codeNum) ? Math.max(highest, codeNum) : highest;
    } catch {
      return highest;
    }
  }, 0);
  return String(lastCode + 1).padStart(6, '0');
};

export const fetchInventoryItems = async (
  sessionId: string,
  page: number,
  searchQuery: string = ''
) => {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  let query = supabase
    .from('products')
    .select('id, name, stock')
    .order('name', { ascending: true })
    .range(from, to);

  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((p) => ({
    ...p,
    stock_quantity: p.stock || 0,
  }));
};

export const searchProducts = async (query: string) => {
  if (!query || query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, stock, product_variations(id, name, sku, stock)')
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return (data || []).flatMap((product: any) => {
      const variations = Array.isArray(product.product_variations)
        ? product.product_variations
        : [];
      if (variations.length === 0) return [];
      return variations.map((variation: any) => ({
        ...product,
        variation_id: variation.id,
        name: variation.name,
        variationName: variation.name,
        sku: variation.sku || product.sku,
        stock: Number(
          variation.stock !== undefined && variation.stock !== null
            ? variation.stock
            : product.stock || 0
        ),
      }));
    });
  } catch {
    // Fallback offline usando o catálogo local SQLite
    const term = query.trim().toLowerCase();
    const localProducts = await getOfflineInventoryScopeProducts().catch(() => []);
    return localProducts
      .filter((item) =>
        `${item.name || ''} ${item.sku || ''} ${item.code || ''} ${item.barcode || ''}`
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 10)
      .map((item) => ({
        ...item,
        variationName: item.name,
      }));
  }
};

export const fetchInventorySessionDetails = async (sessionId: string) => {
  // 1. Verificar primeiro se é um rascunho ou submissão congelada no SQLite local
  try {
    const localDraft = await getLocalInventoryDraft(sessionId);
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
    const localSubmission = await getInventorySubmission(sessionId);
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
    const cachedDetails = await offlineStorageService.getWorkingSet<Record<string, any>>(
      INVENTORY_SESSION_DETAILS_CACHE_KEY
    );
    if (cachedDetails?.data?.[sessionId]) {
      return cachedDetails.data[sessionId];
    }
  } catch {}

  throw new Error('Não foi possível carregar os detalhes desta sessão de inventário.');
};

const isEffectiveInventoryMove = (move: any) => {
  try {
    const meta = JSON.parse(move.observation || '{}');
    return (
      !['reversed', 'cancelled'].includes(move.status) &&
      !['reversed', 'cancelled'].includes(meta.status)
    );
  } catch {
    return !['reversed', 'cancelled'].includes(move.status);
  }
};

const getTargetStockFromMove = (move: any): number | null => {
  try {
    const target = JSON.parse(move.observation || '{}').targetStock;
    return Number.isFinite(Number(target)) ? Number(target) : null;
  } catch {
    return null;
  }
};

const inventoryMovementDelta = (move: any) => {
  return move.type === 'entry'
    ? Number(move.quantity || 0)
    : move.type === 'exit'
      ? -Number(move.quantity || 0)
      : 0;
};

export const recalculateInventoryAuditBalance = async (productId: string): Promise<boolean> => {
  if (!productId) return false;
  const [{ data: productRow }, { data: rawMoves, error }] = await Promise.all([
    supabase.from('products').select('*, product_variations(*)').eq('id', productId).single(),
    supabase
      .from('inventory_moves')
      .select('*')
      .eq('product_id', productId)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(500),
  ]);
  if (error) throw error;
  if (!productRow) return false;

  const moves = (rawMoves || []).filter(isEffectiveInventoryMove);
  const updatedVariations = [...(productRow.product_variations || [])];
  let hasAnchor = false;

  updatedVariations.forEach((variation: any, index: number) => {
    const variationMoves = moves.filter(
      (move: any) => String(move.variation_id || '') === String(variation.id)
    );
    const anchor = [...variationMoves]
      .reverse()
      .find((move) => getTargetStockFromMove(move) !== null);
    if (!anchor) return;
    hasAnchor = true;
    let stock = getTargetStockFromMove(anchor)!;
    for (const move of variationMoves.slice(variationMoves.indexOf(anchor) + 1))
      stock += inventoryMovementDelta(move);
    updatedVariations[index] = { ...variation, stock };
  });

  const lastAnchor = [...moves]
    .reverse()
    .find((move: any) => getTargetStockFromMove(move) !== null && !move.variation_id);
  if (!hasAnchor && !lastAnchor) return false;

  let stock = Number(productRow.stock || 0);
  if (lastAnchor) {
    stock = getTargetStockFromMove(lastAnchor)!;
    for (const move of moves.slice(moves.indexOf(lastAnchor) + 1))
      stock += inventoryMovementDelta(move);
  } else {
    stock = updatedVariations.reduce(
      (total: number, variation: any) => total + Number(variation.stock || 0),
      0
    );
  }

  await supabase.from('products').update({ stock }).eq('id', productId);
  if (updatedVariations.length > 0) {
    for (const v of updatedVariations) {
      await supabase.from('product_variations').update({ stock: v.stock }).eq('id', v.id);
    }
  }
  return true;
};

export const reverseInventorySession = async (session: {
  id: string;
  inventoryCode?: string;
}): Promise<void> => {
  const code = session.inventoryCode || session.id.split('-')[0];
  const expectedLabel = `Ajuste lançado pelo inventário #${code}`;

  const { data: moves, error } = await supabase
    .from('inventory_moves')
    .select('*')
    .eq('label', expectedLabel);

  if (error) throw error;
  if (!moves || moves.length === 0) return;

  const reversedAt = new Date().toISOString();
  const affectedProductIds = new Set<string>();

  for (const move of moves) {
    if (move.label?.startsWith('Inventário #')) continue;

    let meta: any = {};
    try {
      meta = JSON.parse(move.observation || '{}');
    } catch {
      meta = {};
    }
    if (meta.status === 'reversed' || move.status === 'reversed') continue;

    const updatedObs = JSON.stringify({
      ...meta,
      status: 'reversed',
      reversalReason: 'Estorno de inventário',
      reversedAt,
    });

    await supabase
      .from('inventory_moves')
      .update({ status: 'reversed', observation: updatedObs, reason: 'Estorno de inventário' })
      .eq('id', move.id);

    if (move.product_id) {
      affectedProductIds.add(move.product_id);
    }
  }

  for (const prodId of affectedProductIds) {
    await recalculateInventoryAuditBalance(prodId);
  }
};

export const unreverseInventorySession = async (session: {
  id: string;
  inventoryCode?: string;
}): Promise<void> => {
  const code = session.inventoryCode || session.id.split('-')[0];
  const expectedLabel = `Ajuste lançado pelo inventário #${code}`;

  const { data: moves, error } = await supabase
    .from('inventory_moves')
    .select('*')
    .eq('label', expectedLabel);

  if (error) throw error;
  if (!moves || moves.length === 0) return;

  const affectedProductIds = new Set<string>();

  for (const move of moves) {
    if (move.label?.startsWith('Inventário #')) continue;

    let meta: any = {};
    try {
      meta = JSON.parse(move.observation || '{}');
    } catch {
      meta = {};
    }

    const { reversalReason: _r, reversedAt: _ra, ...cleanMeta } = meta;
    const updatedObs = JSON.stringify({
      ...cleanMeta,
      status: 'effective',
    });

    await supabase
      .from('inventory_moves')
      .update({ status: 'effective', observation: updatedObs, reason: null })
      .eq('id', move.id);

    if (move.product_id) {
      affectedProductIds.add(move.product_id);
    }
  }

  for (const prodId of affectedProductIds) {
    await recalculateInventoryAuditBalance(prodId);
  }
};

export const deleteInventoryDraft = async (markerMoveId: string): Promise<void> => {
  // 1. Remove sempre do armazenamento SQLite local (rascunho, outbox e leituras de etiquetas)
  await deleteLocalInventoryDraft(markerMoveId).catch(() => {});
  await deleteInventorySubmission(markerMoveId).catch(() => {});
  await deleteLocalInventoryScans(markerMoveId).catch(() => {});

  if (!connectivityService.connected) {
    return;
  }

  try {
    const { error } = await supabase.from('inventory_moves').delete().eq('id', markerMoveId);
    if (error) {
      console.warn('[Inventory] Aviso ao excluir rascunho remoto:', error.message);
    }
  } catch (err) {
    console.warn('[Inventory] Falha de rede ao excluir rascunho remoto (excluído localmente):', err);
  }
};

export const saveInventoryDraft = async (params: {
  markerMoveId?: string;
  code: string;
  auditId: string;
  observation: any;
  date?: string;
}): Promise<string> => {
  const { markerMoveId, code, auditId, observation, date } = params;
  const now = date || new Date().toISOString();
  const obsStr = typeof observation === 'string' ? observation : JSON.stringify(observation);

  if (markerMoveId) {
    const { error } = await supabase
      .from('inventory_moves')
      .update({
        date: now,
        observation: obsStr,
        label: `Inventário #${code}`,
      })
      .eq('id', markerMoveId);
    if (error) throw error;
    return markerMoveId;
  } else {
    const { data, error } = await supabase
      .from('inventory_moves')
      .insert({
        type: 'adjustment',
        quantity: 0,
        date: now,
        label: `Inventário #${code}`,
        observation: obsStr,
        created_at: now,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }
};
