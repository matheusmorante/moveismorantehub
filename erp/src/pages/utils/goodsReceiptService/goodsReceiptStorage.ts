import { GoodsReceipt } from './goodsReceipt.types';
import { supabase } from '@/pages/utils/supabaseConfig';
import { isTestGoodsReceipt } from './goodsReceiptMapper';
import { getGoodsReceiptIndex } from '../goodsReceiptCode';

const STORAGE_KEY = 'morantehub_goods_receipts_v1';

export const getStoredReceipts = (): GoodsReceipt[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredReceipts = (items: GoodsReceipt[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar recebimentos localmente:', e);
  }
};

let listeners: Array<(receipts: GoodsReceipt[]) => void> = [];

export const notifyListeners = (receiptsList?: GoodsReceipt[]) => {
  const list = receiptsList || getStoredReceipts();
  listeners.forEach((cb) => {
    try {
      cb([...list]);
    } catch (e) {
      console.error(e);
    }
  });
};

export const addReceiptListener = (callback: (receipts: GoodsReceipt[]) => void) => {
  listeners.push(callback);
};

export const removeReceiptListener = (callback: (receipts: GoodsReceipt[]) => void) => {
  listeners = listeners.filter((cb) => cb !== callback);
};

const isValidUuid = (val?: string) =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

/**
 * Garante que todos os recebimentos possuam um receiptIndex válido sequencial.
 * Atua como auto-cura transparente para registros legados ou criados sem código.
 */
export const ensureReceiptIndexes = async (items: GoodsReceipt[]): Promise<GoodsReceipt[]> => {
  let needsSave = false;
  const list = await Promise.all(
    items.map(async (item) => {
      if (isTestGoodsReceipt(item) || getGoodsReceiptIndex(item) || !isValidUuid(item.id))
        return item;

      try {
        const { data, error } = await supabase
          .from('goods_receipts')
          .update({ receipt_index: null })
          .eq('id', item.id)
          .is('receipt_index', null)
          .select('receipt_index');
        if (error) return item;

        const assignedIndex = Number(data?.[0]?.receipt_index);
        if (getGoodsReceiptIndex({ receiptIndex: assignedIndex })) {
          needsSave = true;
          return { ...item, receiptIndex: assignedIndex };
        }

        const { data: currentRows, error: readError } = await supabase
          .from('goods_receipts')
          .select('receipt_index')
          .eq('id', item.id);
        const currentIndex = Number(currentRows?.[0]?.receipt_index);
        if (!readError && getGoodsReceiptIndex({ receiptIndex: currentIndex })) {
          needsSave = true;
          return { ...item, receiptIndex: currentIndex };
        }
      } catch {
        /* Deixa o código pendente quando o banco não puder reservá-lo. */
      }

      return item;
    })
  );

  const result = list.sort(
    (a, b) =>
      new Date(b.updatedAt || b.receivedAt).getTime() -
      new Date(a.updatedAt || a.receivedAt).getTime()
  );
  if (needsSave) saveStoredReceipts(result);
  return result;
};
