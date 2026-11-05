import React, { useEffect, useRef, useState } from 'react';
import type Order from '@/pages/types/order.type';
import { fetchOrderById } from '@/pages/utils/orderHistoryService';
import OrderDetailsModal from '@/pages/App/DeliverySchedule/OrderDetailsModal';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

interface CustomerOrderDetailsModalProps {
  orderId: string;
  onClose: () => void;
}

const ORDER_DETAILS_TIMEOUT_MS = 15_000;

export const CustomerOrderDetailsModal: React.FC<CustomerOrderDetailsModalProps> = ({ orderId, onClose }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setOrder(null);
    setIsLoading(true);
    setHasError(false);

    void withTimeout(
      fetchOrderById(orderId),
      ORDER_DETAILS_TIMEOUT_MS,
      null,
      'central:detalhes-pedido-cliente',
    ).then((result) => {
      if (requestId !== requestIdRef.current) return;
      if (result) setOrder(result);
      else setHasError(true);
    }).catch(() => {
      if (requestId === requestIdRef.current) setHasError(true);
    }).finally(() => {
      if (requestId === requestIdRef.current) setIsLoading(false);
    });

    return () => {
      if (requestId === requestIdRef.current) requestIdRef.current += 1;
    };
  }, [orderId, retryKey]);

  if (order) return <OrderDetailsModal order={order} isReadOnly onClose={onClose} />;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-order-details-loading-title"
      className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="customer-order-details-loading-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Detalhes do registro
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar detalhes do registro" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <i className="bi bi-x-lg text-xs" aria-hidden="true" />
          </button>
        </div>
        {isLoading ? (
          <div role="status" className="flex items-center justify-center gap-3 py-10 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            Carregando detalhes do registro…
          </div>
        ) : hasError ? (
          <div className="py-6 text-center">
            <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">Não foi possível carregar os detalhes deste registro.</p>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
              Tentar novamente
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
};
