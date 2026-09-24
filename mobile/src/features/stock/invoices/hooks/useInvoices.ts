import { useCallback, useEffect, useRef, useState } from 'react';
import type { Invoice, InvoiceDateFilter } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';
import { getDefaultInvoiceDateFilter } from '../utils/invoiceList';

export const useInvoices = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<InvoiceDateFilter>(() => getDefaultInvoiceDateFilter());
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [reloadVersion, setReloadVersion] = useState(0);
    const requestId = useRef(0);

    useEffect(() => {
        const currentRequest = ++requestId.current;
        setLoading(true);
        setError(null);

        const timer = setTimeout(() => {
            void stockService.fetchInboundInvoicesPage({
                page: page - 1,
                searchTerm,
                dateFilter,
            }).then((result) => {
                if (currentRequest !== requestId.current) return;
                setInvoices(result.invoices);
                setTotalCount(result.totalCount);
                setTotalPages(result.totalPages);
            }).catch((loadError: unknown) => {
                if (currentRequest !== requestId.current) return;
                console.error('Failed to fetch invoices:', loadError);
                setError('Erro ao carregar notas fiscais. Tente novamente.');
                setInvoices([]);
                setTotalCount(0);
                setTotalPages(1);
            }).finally(() => {
                if (currentRequest === requestId.current) setLoading(false);
            });
        }, 350);

        return () => clearTimeout(timer);
    }, [page, searchTerm, dateFilter, reloadVersion]);

    const updateSearchTerm = useCallback((value: string) => {
        setPage(1);
        setSearchTerm(value);
    }, []);

    const updateDateFilter = useCallback((value: InvoiceDateFilter) => {
        setPage(1);
        setDateFilter(value);
    }, []);

    const goToPage = useCallback((newPage: number) => {
        if (!loading && newPage >= 1 && newPage <= totalPages) setPage(newPage);
    }, [loading, totalPages]);

    return {
        invoices,
        loading,
        error,
        page,
        totalPages,
        totalCount,
        searchTerm,
        dateFilter,
        setSearchTerm: updateSearchTerm,
        setDateFilter: updateDateFilter,
        goToPage,
        reload: () => setReloadVersion((version) => version + 1),
    };
};
