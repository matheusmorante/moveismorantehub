import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from '../../types/inventoryMove.type';
import { INVENTORY_TABLE_NAME } from './inventoryTypeRules';
import { mapInventoryMoveFromDB } from './inventoryMapper';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export const getInventoryMoveById = async (id: string): Promise<InventoryMove | null> => {
  try {
    const { data, error } = await supabase
      .from(INVENTORY_TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? mapInventoryMoveFromDB(data) : null;
  } catch (error) {
    console.error('Erro ao buscar lançamento de estoque:', error);
    return null;
  }
};

export const getAvailableLots = async (
  productId: string,
  variationId?: string
): Promise<(InventoryMove & { balance: number })[]> => {
  try {
    let query = supabase
      .from(INVENTORY_TABLE_NAME)
      .select('*')
      .eq('type', 'entry')
      .order('date', { ascending: true });

    if (variationId) {
      query = query.eq('variation_id', variationId).eq('product_id', productId);
    } else {
      query = query.eq('product_id', productId).is('variation_id', null);
    }

    const { data: entries, error: entryError } = await query;
    if (entryError) throw entryError;

    const availableLots = (entries || [])
      .map((e: any) => mapInventoryMoveFromDB(e))
      .filter((move) => move.status !== 'reversed' && move.status !== 'cancelled')
      .map((move) => ({ ...move, balance: move.quantity }));

    return availableLots;
  } catch (error) {
    console.error('Erro ao buscar lotes disponíveis:', error);
    return [];
  }
};

export const getNextInventoryCode = async (
  reservedCodes: readonly string[] = []
): Promise<string> => {
  const { data, error } = await supabase.rpc('reserve_next_inventory_code', {
    p_reserved_codes: [...reservedCodes],
  });
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

  const response = await withTimeout(
    Promise.resolve(
      supabase.rpc('reserve_next_inventory_codes', {
        p_reserved_codes: [...reservedCodes],
        p_count: count,
      })
    ).then((result) => ({ result })),
    10_000,
    null as { result: { data: string[] | null; error: any } } | null,
    'inventory:next-codes'
  );
  if (!response) throw new Error('A reserva em lote excedeu 10000ms.');
  const { data, error } = response.result;
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
