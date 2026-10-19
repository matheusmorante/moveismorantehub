import { useEffect, useState } from 'react';
import type { AuditItem } from './useInventoryAuditWorkflow';
import { supabase } from '../../../../services/supabaseClient';
import { connectivityService } from '../../../../services/offline/connectivityService';

export type ReconciledAuditItem = AuditItem & {
  reconciledExpected: number;
  difference: number;
};

export function useInventoryReconciliation(items: AuditItem[], startDate: string) {
  const [reconciledItems, setReconciledItems] = useState<ReconciledAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconcileError, setReconcileError] = useState(false);

  useEffect(() => {
    let active = true;
    const reconcile = async () => {
      setLoading(true);
      setReconcileError(false);
      try {
        if (!connectivityService.connected) throw new Error('Inventário revisado offline');
        const moves: Array<{
          product_id: string | null;
          variation_id: string | null;
          type: string;
          quantity: number | null;
          observation: string | null;
          status: string | null;
        }> = [];
        const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
        for (let offset = 0; offset < productIds.length; offset += 50) {
          const chunk = productIds.slice(offset, offset + 50);
          for (let from = 0; ; from += 200) {
            const { data, error } = await supabase
              .from('inventory_moves')
              .select('product_id, variation_id, type, quantity, observation, status')
              .in('product_id', chunk)
              .gte('date', startDate)
              .order('date', { ascending: true })
              .range(from, from + 199);
            if (error) throw error;
            moves.push(...(data || []));
            if (!data || data.length < 200) break;
          }
        }

        const result = items.map((item) => {
          const relevantMoves = moves
            .filter(
              (move) =>
                String(move.product_id) === String(item.productId) &&
                (item.variationId
                  ? String(move.variation_id) === String(item.variationId)
                  : !move.variation_id)
            )
            .filter((move) => {
              let observation: any = move.observation;
              if (typeof observation === 'string') {
                try {
                  observation = JSON.parse(observation);
                } catch {
                  observation = {};
                }
              }
              if (
                move.status === 'reversed' ||
                move.status === 'cancelled' ||
                observation?.status === 'reversed' ||
                observation?.status === 'cancelled'
              )
                return false;
              return !observation?.inventoryAudit && move.type !== 'adjustment';
            });

          const delta = relevantMoves.reduce((sum, move) => {
            const quantity = Number(move.quantity || 0);
            if (move.type === 'entry') return sum + quantity;
            if (move.type === 'exit') return sum - quantity;
            return sum;
          }, 0);
          const reconciledExpected = Number(item.systemStock || 0) + delta;
          return {
            ...item,
            reconciledExpected,
            difference: item.physicalCount === null ? 0 : item.physicalCount - reconciledExpected,
          };
        });
        if (active) setReconciledItems(result);
      } catch (error) {
        if (connectivityService.connected)
          console.error('Falha ao reconciliar movimentações do inventário:', error);
        if (active) {
          setReconcileError(true);
          setReconciledItems(
            items.map((item) => ({
              ...item,
              reconciledExpected: Number(item.systemStock || 0),
              difference:
                item.physicalCount === null
                  ? 0
                  : item.physicalCount - Number(item.systemStock || 0),
            }))
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void reconcile();
    return () => {
      active = false;
    };
  }, [items, startDate]);

  return { reconciledItems, loading, reconcileError };
}
