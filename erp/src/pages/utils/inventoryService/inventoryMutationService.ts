import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from '../../types/inventoryMove.type';
import { inventoryMoveCommandSchema, inventoryMoveUpdateCommandSchema, InventoryMoveUnconfirmedError } from '../../../../../shared-utils/inventoryMoveSchemas';
import { inventoryBatchEditCommandFormSchema } from '../../../../../shared-utils/catalogFormSchemas';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { INVENTORY_TABLE_NAME } from './inventoryTypeRules';
import { mapInventoryMoveToDB, mapInventoryMoveFromDB } from './inventoryMapper';
import {
  prependMoveToState,
  removeMoveFromState,
  updateMoveInState,
} from './inventorySubscriptionState';
import {
  recalculateProductStockOnMove,
  revertProductStockFromMove,
} from './inventoryStockCalculator';
import { recalculateInventoryAuditBalance } from '@/pages/utils/inventoryAuditBalance';
import { queryClient } from '@/lib/queryClient';
import { invalidateProductCatalogStatsCache } from '@/pages/App/Products/ProductList/services/productCatalogStatsService';

// Existing ledger DDL uses cents; callers can supply an unrounded moving
// average. Accept exact values or the nearest stored cent, never another cost.
const storedMoney = new Intl.NumberFormat('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
const matchesStoredMoney = (actual: unknown, expected: number | null): boolean => {
  if (expected === null) return actual == null;
  if ((typeof actual !== 'number' && typeof actual !== 'string') || (typeof actual === 'string' && !actual.trim())) return false;
  const value = Number(actual);
  return Number.isFinite(value) && value >= 0 && (value === expected
    || value === Number(storedMoney.format(expected)));
};
const confirmedMove = (row: any, expected: ReturnType<typeof mapInventoryMoveToDB>): InventoryMove => {
  if (!row || (typeof row.id !== 'string' && typeof row.id !== 'number') || !String(row.id)
    || row.product_id !== expected.product_id || (row.variation_id || null) !== expected.variation_id
    || row.type !== expected.type || Number(row.quantity) !== expected.quantity
    || new Date(row.date).getTime() !== new Date(expected.date).getTime()
    || (row.label || null) !== expected.label
    || !matchesStoredMoney(row.unit_price ?? 0, expected.unit_price)
    || !matchesStoredMoney(row.unit_cost, expected.unit_cost)
    || (row.order_id || null) !== expected.order_id
    || (row.source_receipt_id || null) !== expected.source_receipt_id
    || (row.source_item_index ?? null) !== expected.source_item_index) throw new InventoryMoveUnconfirmedError();
  return mapInventoryMoveFromDB(row);
};

export const saveInventoryMove = async (
  input: InventoryMove,
  _currentProductStock: number = 0
): Promise<InventoryMove> => {
  const move = inventoryMoveCommandSchema.parse(input);
  const payload = mapInventoryMoveToDB(move);
  let persisted: InventoryMove | undefined;
  try {
    if (move.sourceReceiptId && move.sourceItemIndex !== undefined) {
      const { data: existingMove, error: existingError } = await supabase
        .from(INVENTORY_TABLE_NAME).select('*')
        .eq('source_receipt_id', move.sourceReceiptId).eq('source_item_index', move.sourceItemIndex).maybeSingle();
      if (existingError) throw existingError;
      if (existingMove) return confirmedMove(existingMove, payload);
    }
    let response;
    try { response = await supabase.from(INVENTORY_TABLE_NAME).insert([payload]).select(); }
    catch { throw new InventoryMoveUnconfirmedError(); }
    const { data, error, status } = response;
    if (error) {
      const duplicate = move.sourceReceiptId && move.sourceItemIndex !== undefined && error.code === '23505';
      if (!duplicate) {
        if (status === 0 || !error.code || error.code === 'PGRST116' || error.code === '40003' || error.code.startsWith('08')) throw new InventoryMoveUnconfirmedError();
        throw error;
      }
      const { data: existingMove, error: existingError } = await supabase
        .from(INVENTORY_TABLE_NAME).select('*')
        .eq('source_receipt_id', move.sourceReceiptId).eq('source_item_index', move.sourceItemIndex).single();
      if (existingError) throw new InventoryMoveUnconfirmedError();
      return confirmedMove(existingMove, payload);
    }
    if (!Array.isArray(data) || data.length !== 1) throw new InventoryMoveUnconfirmedError();
    persisted = confirmedMove(data[0], payload);
    prependMoveToState(persisted);
    if (await recalculateInventoryAuditBalance(move.productId)) return persisted;
    await recalculateProductStockOnMove({ ...move, unitCost: persisted.unitCost, unitPrice: persisted.unitPrice });
    return persisted;
  } catch (cause) {
    // The ledger insert cannot be undone by a later client-side balance failure.
    if (persisted) throw new InventoryMoveUnconfirmedError(persisted.id);
    throw cause;
  }
};

export const deleteInventoryMove = async (
  id: string,
  _allowLinkedOrderMove = false,
  allowDraftAuditDelete = false
): Promise<void> => {
  try {
    const { data: moveData } = await supabase
      .from(INVENTORY_TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();
    if (!moveData) return;

    const move = mapInventoryMoveFromDB(moveData);
    let isDraftAudit = false;
    try {
      isDraftAudit = JSON.parse(move.observation || '{}').status === 'in_progress';
    } catch {
      /* no-op: intencionalmente silencioso */
    }

    if (
      !allowDraftAuditDelete ||
      !isDraftAudit ||
      !move.label?.startsWith('Inventário #') ||
      move.productId
    ) {
      throw new Error(
        'Movimentações efetivadas não podem ser excluídas. Faça o estorno vinculado à operação original.'
      );
    }

    const { error } = await supabase.from(INVENTORY_TABLE_NAME).delete().eq('id', id);

    if (error) throw error;

    // Atualizar estado em memória
    removeMoveFromState(id);

    if (await recalculateInventoryAuditBalance(move.productId)) return;

    // Reverter saldo do estoque do produto
    await revertProductStockFromMove(move);
  } catch (error) {
    console.error('Erro ao excluir/estornar lançamento de estoque: ', error);
    throw error;
  }
};

export const updateInventoryMove = async (
  id: string,
  changes: Partial<InventoryMove>,
  expected?: { productId: string; quantity: number; unitCost: number },
): Promise<InventoryMove> => {
  const command = inventoryMoveUpdateCommandSchema.parse({ id, updates: changes, expected });
  const updates = command.updates;
  const lookup = await withTimeout(supabase
      .from(INVENTORY_TABLE_NAME)
      .select('*')
      .eq('id', command.id)
      .single().then((result) => ({ result })), 10_000, null, 'historico:lote-antes-de-alterar');
  if (!lookup) throw new Error('Não foi possível consultar o lote no prazo. Recarregue o histórico antes de salvar.');
  const { data: oldMove, error: lookupError } = lookup.result;
  if (lookupError) throw lookupError;
  if (!oldMove) throw new Error('Movimento não encontrado.');
  if (oldMove.id !== command.id || oldMove.type !== 'entry' || oldMove.quantity == null
    || !Number.isFinite(Number(oldMove.quantity))) throw new Error('Os dados do lote não são válidos.');
  if (oldMove.product_id !== command.expected.productId || Number(oldMove.quantity) !== command.expected.quantity
    || Number(oldMove.unit_cost ?? 0) !== command.expected.unitCost) {
    throw new Error('O lote foi alterado. Recarregue o histórico antes de salvar.');
  }
  const { quantity, unitCost } = inventoryBatchEditCommandFormSchema.parse({
    quantity: updates.quantity ?? command.expected.quantity, unitCost: updates.unitCost ?? command.expected.unitCost,
    moveId: command.id, productId: command.expected.productId,
    previousQuantity: command.expected.quantity, previousUnitCost: command.expected.unitCost,
  });
  let response;
  try {
    response = await supabase.rpc('update_inventory_batch', {
      p_move_id: command.id, p_product_id: command.expected.productId,
      p_expected_quantity: command.expected.quantity, p_expected_unit_cost: command.expected.unitCost,
      p_quantity: quantity, p_unit_cost: unitCost,
    });
  } catch { throw new InventoryMoveUnconfirmedError(); }
  const { data, error, status } = response;
  if (error) {
    if (status === 0 || !error.code || error.code === '40003' || error.code.startsWith('08')) throw new InventoryMoveUnconfirmedError();
    if (error.code === 'PGRST202') throw new Error('A atualização transacional do lote ainda não está disponível. Atualize a configuração do banco antes de salvar.');
    const message = error.code === '40001' ? 'O lote ou o estoque foi alterado. Recarregue o histórico antes de salvar.'
      : error.code === '42501' ? 'Você não tem permissão para alterar este lote. Confira seu acesso.'
        : error.code === '22023' ? 'Confira a quantidade e o custo. A alteração do estoque da variação deve ser inteira.'
          : 'Não foi possível concluir a alteração. Recarregue o histórico e confira os dados e as permissões.';
    throw Object.assign(new Error(message), { code: error.code });
  }
  if (!data?.move || data.move.id !== command.id || typeof data.balance_delta !== 'number'
    || !Number.isFinite(data.balance_delta)) throw new InventoryMoveUnconfirmedError();
  const payload = { ...mapInventoryMoveToDB({ ...mapInventoryMoveFromDB(oldMove), quantity, unitCost }),
    type: 'entry', unit_price: Number(oldMove.unit_price ?? 0),
  };
  const persisted = confirmedMove(data.move, payload);
  updateMoveInState(command.id, persisted);
  invalidateProductCatalogStatsCache();
  void queryClient.invalidateQueries({ queryKey: ['products'] });
  return persisted;
};
