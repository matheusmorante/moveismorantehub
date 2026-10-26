import { supabase } from '@/pages/utils/supabaseConfig';
import InventoryMove from '../../types/inventoryMove.type';
import { INVENTORY_TABLE_NAME } from './inventoryTypeRules';
import { mapInventoryMoveFromDB } from './inventoryMapper';

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
