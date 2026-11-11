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

const RECEIPT_INDEX_BATCH_SIZE = 5;

const chunkReceiptIds = (ids: string[]) => {
  const chunks: string[][] = [];
  for (let offset = 0; offset < ids.length; offset += RECEIPT_INDEX_BATCH_SIZE) {
    chunks.push(ids.slice(offset, offset + RECEIPT_INDEX_BATCH_SIZE));
  }
  return chunks;
};

const normalizeReceiptId = (id: string) => id.toLowerCase();

/**
 * Garante que todos os recebimentos possuam um receiptIndex válido sequencial.
 * Atua como auto-cura transparente para registros legados ou criados sem código.
 */
export const ensureReceiptIndexes = async (items: GoodsReceipt[]): Promise<GoodsReceipt[]> => {
  const candidateIds = Array.from(
    new Set(
      items
        .filter((item) => !isTestGoodsReceipt(item) && !getGoodsReceiptIndex(item) && isValidUuid(item.id))
        .map((item) => normalizeReceiptId(item.id))
    )
  );
  const confirmedIndexes = new Map<string, number>();
  const fallbackIds: string[] = [];

  for (const idBatch of chunkReceiptIds(candidateIds)) {
    try {
      const { data, error } = await supabase
        .from('goods_receipts')
        .update({ receipt_index: null })
        .in('id', idBatch)
        .is('receipt_index', null)
        .select('id, receipt_index');
      if (error) continue;

      const confirmedBatch = new Set<string>();
      (data || []).forEach((row) => {
        const id = normalizeReceiptId(String(row.id));
        const assignedIndex = Number(row.receipt_index);
        if (getGoodsReceiptIndex({ receiptIndex: assignedIndex })) {
          confirmedIndexes.set(id, assignedIndex);
          confirmedBatch.add(id);
        }
      });

      fallbackIds.push(...idBatch.filter((id) => !confirmedBatch.has(id)));
    } catch {
      /* Mantém os itens do bloco como estão; uma carga posterior pode tentar novamente. */
    }
  }

  for (const idBatch of chunkReceiptIds(fallbackIds)) {
    try {
      const { data, error } = await supabase
        .from('goods_receipts')
        .select('id, receipt_index')
        .in('id', idBatch);
      if (error) continue;

      (data || []).forEach((row) => {
        const id = normalizeReceiptId(String(row.id));
        const currentIndex = Number(row.receipt_index);
        if (getGoodsReceiptIndex({ receiptIndex: currentIndex })) {
          confirmedIndexes.set(id, currentIndex);
        }
      });
    } catch {
      /* Mantém os itens do bloco como estão; uma carga posterior pode tentar novamente. */
    }
  }

  const result = items
    .map((item) => {
      const confirmedIndex = confirmedIndexes.get(normalizeReceiptId(item.id));
      return confirmedIndex ? { ...item, receiptIndex: confirmedIndex } : item;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.receivedAt).getTime() -
        new Date(a.updatedAt || a.receivedAt).getTime()
    );
  if (confirmedIndexes.size > 0) saveStoredReceipts(result);
  return result;
};
