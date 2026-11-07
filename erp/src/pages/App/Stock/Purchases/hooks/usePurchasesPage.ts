import { useCallback, useEffect, useState } from 'react';
import type Purchase from '@/pages/types/purchase.type';
import { fetchPurchasesPage, subscribeToPurchasePageChanges } from '@/pages/utils/purchasePageService';

export const usePurchasesPage = (page: number, supplierId: string, userId: string) => {
  const key = JSON.stringify([userId, supplierId, page]);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    key: string; data: Purchase[]; total: number; loading: boolean; error: string | null;
  }>({ key, data: [], total: 0, loading: true, error: null });
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => subscribeToPurchasePageChanges(reload), [reload, userId]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState((current) => ({
      key, data: current.key === key ? current.data : [],
      total: current.key === key ? current.total : 0, loading: true, error: null,
    }));
    void fetchPurchasesPage(page, { supplierId, signal: controller.signal })
      .then((result) => {
        if (active && !controller.signal.aborted) {
          setState({ key, ...result, loading: false, error: null });
        }
      })
      .catch((cause) => {
        if (!active || controller.signal.aborted) return;
        console.error('Erro ao carregar página de compras:', cause);
        setState((current) => ({
          ...current, loading: false,
          error: 'Não foi possível carregar os pedidos de compra. Tente novamente.',
        }));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, page, supplierId, revision]);

  const current = state.key === key;
  return {
    purchases: current ? state.data : [],
    total: current ? state.total : 0,
    loading: !current || state.loading,
    error: current ? state.error : null,
    reload,
  };
};
