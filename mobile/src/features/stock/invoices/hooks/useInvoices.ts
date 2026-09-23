import { useState, useCallback, useEffect } from 'react';
import { Invoice } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';

export const useInvoices = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const loadInvoices = useCallback(async (isRefresh = false, pageNum = 0) => {
        if (isRefresh) {
            setPage(0);
            setHasMore(true);
        } else if (pageNum > 0) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await stockService.fetchInboundInvoices(pageNum);
            
            const formattedData = (data || []).map((inv: any) => ({
                id: inv.id,
                // Campos reais da tabela inbound_invoices
                number: inv.numero_nfe || inv.number || '',
                series: inv.serie || inv.series || '1',
                accessKey: inv.chave_acesso || inv.access_key || '',
                supplierName: inv.emitente_nome || inv.emitente_name || 'Fornecedor Desconhecido',
                supplierCnpj: inv.emitente_cnpj || inv.supplier_cnpj || '',
                issueDate: inv.data_emissao || inv.issue_date || inv.created_at,
                totalValue: inv.valor_total || inv.total_value || 0,
                itemsCount: Array.isArray(inv.itens) && inv.itens.length
                    ? inv.itens.length
                    : Array.isArray(inv.inbound_invoice_items) && inv.inbound_invoice_items.length
                        ? inv.inbound_invoice_items.length
                        : Array.isArray(inv.raw_extraction?.items)
                            ? inv.raw_extraction.items.length
                            : (inv.total_items || 0),
                status: inv.status || 'available',
                hasPendingBindings: (() => {
                    const items = Array.isArray(inv.itens) && inv.itens.length ? inv.itens : inv.inbound_invoice_items || [];
                    if (items.length) return items.some((item: any) => !(item.matchedProductId || item.matched_product_id || item.product_id || item.compositionLinks?.length));
                    return inv.has_pending_bindings !== false;
                })(),
                sefazStatus: inv.sefaz_status || 'pending'
            }));

            if (isRefresh || pageNum === 0) {
                setInvoices(formattedData);
            } else {
                setInvoices(prev => [...prev, ...formattedData]);
            }
            
            if (data && data.length < stockService.ITEMS_PER_PAGE) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
            setHasMore(false);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            void loadInvoices(false, nextPage);
        }
    }, [loadingMore, hasMore, loading, page, loadInvoices]);

    // Carrega na montagem do hook
    useEffect(() => {
        void loadInvoices(true, 0);
    }, [loadInvoices]);

    return { invoices, loading, loadingMore, loadMore, reload: () => loadInvoices(true, 0) };
};
