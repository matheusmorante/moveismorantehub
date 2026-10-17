import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { excludeTestOrders } from '../../../../../../../shared-utils/testArtifactQueries';
import { supabase } from '@/pages/utils/supabaseConfig';
import { parse } from 'date-fns';
import { resolveCanonicalVariationReportItems } from '@/pages/utils/variationCanonicalService';
import { SaleItem } from '../utils/salesReportCalculations';

export const fetchFromERP = async (options: { isCurrent?: () => boolean } = {}): Promise<SaleItem[]> => {
  const checkCurrent = () => { if (options.isCurrent?.() === false) throw Object.assign(new Error('O contexto da consulta do relatório mudou.'), { stopReportLoad: true }); };
  const expired = () => Object.assign(new Error('A consulta de itens do ERP excedeu o prazo.'), { stopReportLoad: true });
  checkCurrent();
  try {
    const itemResponse = await withTimeout(excludeTestOrders(supabase
      .from('order_items')
      .select(`
                id,
                description,
                quantity,
                unit_price,
                cost_price,
                variation_id,
                item_snapshot,
                orders!inner (
                    id,
                    status,
                    order_type,
                    deleted,
                    scheduled_date,
                    created_at
                )
            `), 'orders')
      .eq('orders.deleted', false)
      .neq('orders.order_type', 'budget')
      .neq('orders.status', 'draft')
      .neq('orders.status', 'cancelled'), 15_000, null, 'Consultar itens canônicos do relatório');
    checkCurrent();
    if (!itemResponse) throw expired();
    const { data: itemRows, error: itemError } = itemResponse;

    if (!itemError && itemRows && itemRows.length > 0) {
      const items: SaleItem[] = itemRows.map((row: any) => {
        const orderObj = row.orders;
        const rawDate = orderObj?.scheduled_date || orderObj?.created_at;
        const date = rawDate ? new Date(rawDate) : new Date();
        const qty = Number(row.quantity) || 0;
        const unitPrice = Number(row.unit_price) || 0;
        const salesVal = qty * unitPrice;
        const costPrice = Number(row.cost_price);
        const hasCost = Number.isFinite(costPrice) && costPrice > 0;
        const cost = hasCost ? costPrice : undefined;
        const profit = cost === undefined ? undefined : salesVal - cost * qty;
        const snapshot = row.item_snapshot || {};

        return {
          date,
          product: row.description || snapshot.description || 'Sem Descrição',
          supplier: snapshot.mainSupplierName || 'Sem Fornecedor',
          quantity: qty,
          cost: cost,
          salesValue: salesVal,
          profit: profit,
          variationId: row.variation_id || snapshot.variationId || undefined,
        };
      });

      const resolved = await withTimeout(resolveCanonicalVariationReportItems(items), 15_000, null, 'Resolver variações do relatório').catch(failure => { throw Object.assign(failure instanceof Error ? failure : new Error('Falha ao resolver variações.'), { stopReportLoad: true }); });
      checkCurrent(); if (!resolved) throw expired(); return resolved;
    }
  } catch (err) {
    checkCurrent();
    if (err && typeof err === 'object' && 'stopReportLoad' in err) throw err;
    console.warn('Falha ao carregar relatório via order_items, ativando fallback JSONB:', err);
  }

  checkCurrent();
  const fallbackResponse = await withTimeout(excludeTestOrders(supabase
    .from('orders')
    .select('id, status, order_type, deleted, order_data'))
    .is('order_data->deleted', null), 15_000, null, 'Consultar relatório no histórico ERP');
  checkCurrent(); if (!fallbackResponse) throw expired();
  const { data, error } = fallbackResponse;

  if (error) throw error;

  const items: SaleItem[] = [];
  data.forEach((row: any) => {
    const order = row.order_data;
    if (!order) return;

    if (
      order.deleted ||
      order.orderType === 'budget' ||
      order.status === 'draft' ||
      order.status === 'cancelled'
    )
      return;

    const date = order.date
      ? order.date.includes('/')
        ? parse(order.date.split(',')[0], 'dd/MM/yyyy', new Date())
        : new Date(order.date)
      : new Date();

    order.items?.forEach((item: any) => {
      const qty = Number(item.quantity) || 0;
      const salesVal = Number(item.totalPrice) || qty * (Number(item.unitPrice) || 0);
      const hasCost = Number.isFinite(Number(item.unitCost)) && Number(item.unitCost) > 0;
      const cost = hasCost ? Number(item.unitCost) : undefined;
      const profit = cost === undefined ? undefined : salesVal - cost * qty;

      items.push({
        date,
        product: item.description || 'Sem Descrição',
        supplier: item.mainSupplierName || 'Sem Fornecedor',
        quantity: qty,
        cost: cost,
        salesValue: salesVal,
        profit: profit,
        variationId: item.variationId || undefined,
      });
    });
  });

  const resolved = await withTimeout(resolveCanonicalVariationReportItems(items), 15_000, null, 'Resolver histórico do relatório');
  checkCurrent(); if (!resolved) throw expired(); return resolved;
};
