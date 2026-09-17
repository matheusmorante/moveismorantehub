import { supabase } from '@/pages/utils/supabaseConfig';
import { parse } from 'date-fns';
import { resolveCanonicalVariationReportItems } from '@/pages/utils/variationCanonicalService';
import { SaleItem } from '../utils/salesReportCalculations';

export const fetchFromERP = async (): Promise<SaleItem[]> => {
    try {
        const { data: itemRows, error: itemError } = await supabase
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
            `)
            .eq('orders.deleted', false)
            .neq('orders.order_type', 'budget')
            .neq('orders.status', 'draft')
            .neq('orders.status', 'cancelled');

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
                const profit = cost === undefined ? undefined : salesVal - (cost * qty);
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

            return resolveCanonicalVariationReportItems(items);
        }
    } catch (err) {
        console.warn('Falha ao carregar relatório via order_items, ativando fallback JSONB:', err);
    }

    const { data, error } = await supabase
        .from('orders')
        .select('id, status, order_type, deleted, order_data')
        .is('order_data->deleted', null);

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
        ) return;

        const date = order.date ? (order.date.includes('/') ? parse(order.date.split(',')[0], 'dd/MM/yyyy', new Date()) : new Date(order.date)) : new Date();

        order.items?.forEach((item: any) => {
            const qty = Number(item.quantity) || 0;
            const salesVal = Number(item.totalPrice) || (qty * (Number(item.unitPrice) || 0));
            const hasCost = Number.isFinite(Number(item.unitCost)) && Number(item.unitCost) > 0;
            const cost = hasCost ? Number(item.unitCost) : undefined;
            const profit = cost === undefined ? undefined : salesVal - (cost * qty);

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

    return resolveCanonicalVariationReportItems(items);
};

export const fetchSavedReports = async () => {
    const { data, error } = await supabase
        .from('sales_order_reports')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const insertReport = async (name: string, source: 'erp' | 'csv', report_data: any, config: any) => {
    const { data, error } = await supabase
        .from('sales_order_reports')
        .insert([{
            name,
            type: 'abc_curve',
            source,
            report_data,
            config,
            created_at: new Date().toISOString()
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateReportInDb = async (id: string, name: string, source: 'erp' | 'csv', report_data: any, config: any) => {
    const { data, error } = await supabase
        .from('sales_order_reports')
        .update({
            name,
            source,
            report_data,
            config,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data?.[0];
};

export const deleteReportFromDb = async (id: string) => {
    const { error } = await supabase.from('sales_order_reports').delete().eq('id', id);
    if (error) throw error;
};
