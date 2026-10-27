import React, { useState, useEffect, useRef } from 'react';
import Order from '@/pages/types/order.type';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';
import { formatOrderCode } from '@/pages/utils/orderCode';
import { getOrderStatusLabel } from '@/pages/utils/orderStatusPresentation';
import {
  fetchFulfilledSalesOrdersPage,
  FetchFulfilledOrdersOptions,
} from '@/pages/utils/orderHistoryService';
import OrderPagination from '../OrderHistoryList/OrderPagination';

export interface OrderSelectionModalProps {
  orders?: Order[];
  onSelect: (order: Order) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  fetchPage?: (options: FetchFulfilledOrdersOptions) => Promise<{ orders: Order[]; total: number }>;
}

const isFulfilledSalesOrder = (o: Order) => {
  if (o.deleted) return false;
  const type = String(o.orderType || '').toLowerCase();
  const isSale = !['budget', 'assistance', 'return'].includes(type);
  const status = String(o.status || '').toLowerCase();
  const isFulfilled = ['fulfilled', 'atendido', 'delivered', 'entregue', 'retirado'].includes(status);
  return isSale && isFulfilled;
};

const getOrderCustomerName = (o: Order): string => {
  return o.customerData?.fullName || (o as any).customer_name || (o as any).customerName || '';
};

const getOrderDate = (o: Order): string => {
  return o.date || (o as any).created_at || '';
};

const getOrderValue = (o: Order): number => {
  return o.paymentsSummary?.totalOrderValue ?? (o as any).total_amount ?? (o as any).totalAmount ?? 0;
};

const OrderSelectionModal: React.FC<OrderSelectionModalProps> = ({
  orders: staticOrders,
  onSelect,
  onClose,
  title = 'Selecionar Pedido Original',
  subtitle = 'Busque a venda atendida que originou a assistência',
  fetchPage = fetchFulfilledSalesOrdersPage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<'id' | 'date' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [pagedOrders, setPagedOrders] = useState<Order[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const requestIdRef = useRef(0);

  // Debounce do termo de busca para não disparar consultas desnecessárias a cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Carregamento dos pedidos (modo em memória para testes/fallbacks ou modo servidor com paginação)
  useEffect(() => {
    if (staticOrders) {
      const normTerm = normalizeSearchTerm(debouncedSearch);
      const filtered = staticOrders
        .filter((o) => {
          if (!isFulfilledSalesOrder(o)) return false;
          if (!normTerm) return true;
          const matchId = normalizeSearchTerm(o.id || '').includes(normTerm);
          const matchCode = normalizeSearchTerm(formatOrderCode(o)).includes(normTerm);
          const matchCustomer = normalizeSearchTerm(getOrderCustomerName(o)).includes(normTerm);
          return matchId || matchCode || matchCustomer;
        })
        .sort((a, b) => {
          let comparison = 0;
          if (sortField === 'id') {
            comparison = (a.id || '').localeCompare(b.id || '');
          } else if (sortField === 'date') {
            comparison = getOrderDate(a).localeCompare(getOrderDate(b));
          } else if (sortField === 'customer') {
            comparison = getOrderCustomerName(a).localeCompare(getOrderCustomerName(b));
          }
          return sortOrder === 'asc' ? comparison : -comparison;
        });

      setTotalItems(filtered.length);
      const startIndex = (currentPage - 1) * itemsPerPage;
      setPagedOrders(filtered.slice(startIndex, startIndex + itemsPerPage));
      setLoading(false);
      return;
    }

    let isCurrent = true;
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);

    fetchPage({
      page: currentPage,
      pageSize: itemsPerPage,
      searchTerm: debouncedSearch,
      sortBy: sortField,
      sortOrder,
    })
      .then((res) => {
        if (!isCurrent || currentRequestId !== requestIdRef.current) return;
        setPagedOrders(res.orders || []);
        setTotalItems(res.total || 0);
      })
      .catch((err) => {
        if (!isCurrent || currentRequestId !== requestIdRef.current) return;
        console.error('[OrderSelectionModal] Erro ao carregar pedidos atendidos:', err);
        setPagedOrders([]);
        setTotalItems(0);
      })
      .finally(() => {
        if (isCurrent && currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [staticOrders, currentPage, itemsPerPage, debouncedSearch, sortField, sortOrder, fetchPage]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'customer' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t sm:border border-slate-100 dark:border-slate-800"
        style={{ height: '90vh', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {title}
            </h2>
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
            title="Fechar modal"
          >
            <i className="bi bi-x-lg text-xl" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative flex-1 group">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por Código ou Nome do Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-slate-100 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Limpar busca"
              >
                <i className="bi bi-x-circle-fill" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 select-none">
                <th
                  className="px-4 py-3 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleSort('id')}
                >
                  ID{' '}
                  {sortField === 'id' && (
                    <i className={`bi bi-sort-${sortOrder === 'asc' ? 'up' : 'down'}`} />
                  )}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  Data{' '}
                  {sortField === 'date' && (
                    <i className={`bi bi-sort-${sortOrder === 'asc' ? 'up' : 'down'}`} />
                  )}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => handleSort('customer')}
                >
                  Cliente{' '}
                  {sortField === 'customer' && (
                    <i className={`bi bi-sort-${sortOrder === 'asc' ? 'up' : 'down'}`} />
                  )}
                </th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading && pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                      <span className="text-xs uppercase tracking-widest font-black text-slate-500 dark:text-slate-400">
                        Carregando pedidos atendidos...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : pagedOrders.length > 0 ? (
                pagedOrders.map((o) => {
                  const code = formatOrderCode(o);
                  const displayCode = code !== 'CÓDIGO INVÁLIDO' ? `#${code}` : `#${o.id}`;
                  const statusLabel = getOrderStatusLabel(o, 'Atendido');

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group"
                    >
                      <td className="px-4 py-4 text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                        {displayCode}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {formatToBRDate(getOrderDate(o))}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-100">
                        {getOrderCustomerName(o) || 'Cliente não identificado'}
                      </td>
                      <td className="px-4 py-4 text-xs font-black text-slate-800 dark:text-slate-200 text-right">
                        {formatCurrency(getOrderValue(o))}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                          <i className="bi bi-check-circle-fill mr-1 text-[9px]" />
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => onSelect(o)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 hover:shadow-md hover:shadow-blue-500/20"
                        >
                          Selecionar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-bold italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <i className="bi bi-inbox text-3xl text-slate-300 dark:text-slate-600" />
                      <span>Nenhum pedido de venda atendido encontrado.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer com Paginação */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
          <OrderPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setCurrentPage(1);
              setItemsPerPage(size);
            }}
            preferenceKey="order-selection"
            loading={loading}
            ariaLabel="Paginação de seleção de pedido atendido"
            className="my-0"
          />
        </div>
      </div>
    </div>
  );
};

export default OrderSelectionModal;
