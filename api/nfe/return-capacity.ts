import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { parseAuthorizedInvoiceLines } from '../../erp/src/pages/utils/nfe/invoiceLineSnapshot';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

type FiscalDocRow = { id: string; modelo: string; xml_nfe: string | null };
type FiscalSnapshotRow = { item_number: number; billed_quantity: number | string };
type PriorReturnRow = { id: string; status?: string; items?: Array<{ returnedQuantity?: number; quantity?: number }>; order_data?: {
    status?: string; items?: Array<{ returnedQuantity?: number; quantity?: number }>;
} };
type AllocationRow = { return_order_id: string; return_item_index: number; original_document_id: string;
    original_item_number: number; quantity: number | string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido.' });
    if (!serviceKey) return res.status(503).json({ success: false, error: 'Serviço fiscal indisponível.' });
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ success: false, error: 'Autenticação necessária.' });
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return res.status(401).json({ success: false, error: 'Sessão inválida.' });
    const orderId = String(req.body?.orderId || '');
    if (!orderId) return res.status(400).json({ success: false, error: 'Pedido original não informado.' });

    try {
        const { data: docsData, error: docsError } = await supabase.from('nfe_documents')
            .select('id,modelo,ambiente,status,document_type,xml_nfe,created_at')
            .eq('order_id', orderId).eq('document_type', 'outbound').eq('status', 'autorizada').eq('ambiente', 1)
            .in('modelo', ['55', '65']).order('created_at', { ascending: true });
        if (docsError) throw docsError;
        const docs = (docsData || []) as FiscalDocRow[];
        if (!docs.length) return res.status(200).json({ success: true, hasAuthorizedProductionInvoice: false, lines: [] });

        const documentIds = docs.map((doc) => doc.id);
        const lines = [];
        for (const doc of docs) {
            if (!doc.xml_nfe) throw new Error(`XML da NF-e autorizada ${doc.id} indisponível; não é possível calcular saldo fiscal.`);
            const parsedLines = parseAuthorizedInvoiceLines(doc.xml_nfe);
            const { data: snapshotsData, error: snapshotError } = await supabase.from('nfe_document_items')
                .select('item_number,billed_quantity,product_code,description').eq('document_id', doc.id);
            if (snapshotError) throw snapshotError;
            const snapshots = (snapshotsData || []) as FiscalSnapshotRow[];
            // Historical documents are read-only. Never infer/persist their fiscal
            // lineage during an ordinary capacity lookup.
            if (!snapshots.length || snapshots.length !== parsedLines.length || parsedLines.some((line) =>
                !snapshots.some((snapshot) => snapshot.item_number === line.invoiceItemNumber &&
                    Number(snapshot.billed_quantity) === line.billedQuantity))) {
                throw new Error('NF-e antiga sem itens fiscais reconciliados. A devolução fiscal requer conferência manual da origem.');
            }
            lines.push(...parsedLines.map((line) => ({
                originalDocumentId: doc.id,
                originalModel: doc.modelo,
                originalItemNumber: line.invoiceItemNumber,
                productCode: line.productCode,
                description: line.description,
                billedQuantity: line.billedQuantity,
            })));
        }

        const { data: priorReturnsData, error: priorReturnsError } = await supabase.from('orders')
            .select('id,status,items,order_data').eq('order_type', 'return')
            .or(`linked_order_id.eq.${orderId},order_data->>linkedOrderId.eq.${orderId}`);
        if (priorReturnsError) throw priorReturnsError;
        const priorReturns = (priorReturnsData || []) as PriorReturnRow[];
        const { data: priorAllocationsData, error: priorAllocationError } = await supabase.from('nfe_return_item_allocations')
            .select('return_order_id,return_item_index,original_document_id,original_item_number,quantity')
            .in('original_document_id', documentIds);
        if (priorAllocationError) throw priorAllocationError;
        const priorAllocations = (priorAllocationsData || []) as AllocationRow[];
        const alreadyMappedReturns = new Set(priorAllocations.map((allocation) => allocation.return_order_id));
        const unmappedReturn = priorReturns.find((row) => {
            if (['cancelled', 'cancelado'].includes(String(row.status || row.order_data?.status || '').toLowerCase())) return false;
            if (!alreadyMappedReturns.has(row.id)) return true;
            const returnedItems = row.items || row.order_data?.items || [];
            return returnedItems.some((item: any, index: number) => {
                const quantity = Number(item.returnedQuantity ?? item.quantity);
                const mapped = priorAllocations
                    .filter((allocation) => allocation.return_order_id === row.id && allocation.return_item_index === index)
                    .reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);
                return !Number.isFinite(quantity) || Math.abs(mapped - quantity) > 0.0001;
            });
        });
        if (unmappedReturn) {
            throw new Error('Há devolução anterior sem vínculo fiscal conferido. Reconcilie-a manualmente antes de calcular novo saldo.');
        }
        const allocations = priorAllocations;
        const returnOrderIds = [...new Set((allocations || []).map((allocation) => allocation.return_order_id))];
        const { data: returnOrdersData, error: returnOrderError } = returnOrderIds.length
            ? await supabase.from('orders').select('id,status,order_data').in('id', returnOrderIds)
            : { data: [], error: null };
        if (returnOrderError) throw returnOrderError;
        const returnOrders = (returnOrdersData || []) as PriorReturnRow[];
        const statusByOrderId = new Map(returnOrders.map((row) => [row.id, row.status || row.order_data?.status || 'scheduled']));
        const result = lines.map((line) => {
            const related = (allocations || []).filter((allocation) => allocation.original_document_id === line.originalDocumentId && allocation.original_item_number === line.originalItemNumber &&
                !['cancelled', 'cancelado'].includes(String(statusByOrderId.get(allocation.return_order_id) || '').toLowerCase()));
            const reservedQuantity = related.reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);
            return { ...line, reservedQuantity, availableQuantity: Math.max(line.billedQuantity - reservedQuantity, 0) };
        });
        return res.status(200).json({ success: true, hasAuthorizedProductionInvoice: true, lines: result });
    } catch (error: any) {
        console.error('[NF-e Return Capacity] Falha ao calcular saldo fiscal:', error?.message || 'erro desconhecido');
        return res.status(503).json({ success: false, error: error?.message || 'Não foi possível validar o saldo faturado.' });
    }
}
