import { supabase } from '../../supabaseClient';
import { connectivityService } from '../../offline/connectivityService';
import { deleteLocalInventoryDraft, getLocalInventoryDraft } from '../../sqlite/inventoryDrafts';
import { deleteInventorySubmission } from '../../sqlite/inventoryOutbox';
import { deleteLocalInventoryScans } from '../../sqlite/inventoryScans';

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
  const localDraft = await getLocalInventoryDraft(markerMoveId).catch(() => null);

  // 1. Remove sempre do armazenamento SQLite local (rascunho, outbox e leituras de etiquetas)
  await deleteLocalInventoryDraft(markerMoveId).catch(() => {});
  await deleteInventorySubmission(markerMoveId).catch(() => {});
  await deleteLocalInventoryScans(markerMoveId).catch(() => {});

  if (!connectivityService.connected || localDraft?.code.startsWith('LOCAL-')) {
    return;
  }

  try {
    const { error } = await supabase.from('inventory_moves').delete().eq('id', markerMoveId);
    if (error) {
      console.warn('[Inventory] Aviso ao excluir rascunho remoto:', error.message);
    }
  } catch (err) {
    console.warn(
      '[Inventory] Falha de rede ao excluir rascunho remoto (excluído localmente):',
      err
    );
  }
};

export const saveInventoryDraft = async (params: {
  markerMoveId?: string;
  code: string;
  auditId: string;
  observation: any;
  date?: string;
}): Promise<string> => {
  const { markerMoveId, code, observation, date } = params;
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
