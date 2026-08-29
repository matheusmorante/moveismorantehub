import { supabase } from '@/pages/utils/supabaseConfig';
import { PurchaseItem } from '../types/purchase.type';

export type GoodsReceipt = {
    id: string; purchaseId?: string; supplierName: string; receivedAt: string;
    invoiceNumber?: string; invoiceDate?: string; items: PurchaseItem[];
    totalValue: number; observation?: string;
};

const map = (row: any): GoodsReceipt => ({
    id: String(row.id), purchaseId: row.purchase_id || undefined, supplierName: row.supplier_name,
    receivedAt: row.received_at, invoiceNumber: row.invoice_number || undefined,
    invoiceDate: row.invoice_date || undefined, items: row.items || [],
    totalValue: Number(row.total_value || 0), observation: row.observation || '',
});

export const saveGoodsReceipt = async (receipt: Omit<GoodsReceipt, 'id'>) => {
    const { error } = await supabase.from('goods_receipts').insert({
        purchase_id: receipt.purchaseId || null, supplier_name: receipt.supplierName,
        received_at: receipt.receivedAt, invoice_number: receipt.invoiceNumber || null,
        invoice_date: receipt.invoiceDate || null, items: receipt.items,
        total_value: receipt.totalValue, observation: receipt.observation || '',
    });
    if (error) throw error;
};

export const subscribeToGoodsReceipts = (callback: (items: GoodsReceipt[]) => void) => {
    const load = async () => {
        const { data, error } = await supabase.from('goods_receipts').select('*').order('received_at', { ascending: false });
        callback(error ? [] : (data || []).map(map));
    };
    load();
    const channel = supabase.channel(`goods_receipts_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goods_receipts' }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
};
