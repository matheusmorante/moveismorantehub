import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { fetchOrderById } from '@/pages/utils/orderHistoryService';
import type { useSalesOrderForm } from '../../../hooks/useSalesOrderForm';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';

interface UseOrderEditLoaderParams {
  readonly order?: Order;
  readonly orderId?: string;
  readonly propOnClose?: () => void;
  readonly propOnSaveSuccess?: (id?: string, order?: Order) => void;
  readonly initialStep?: number;
  readonly formActions: ReturnType<typeof useSalesOrderForm>['actions'];
}

export function useOrderEditLoader({
  order,
  orderId,
  propOnClose,
  propOnSaveSuccess,
  initialStep,
  formActions,
}: UseOrderEditLoaderParams) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const id = orderId || order?.id || paramId;
  const shouldNavigateOnMissing = !orderId && !order;
  const [loadedOrder, setLoadedOrder] = useState<Order | null>(null);
  const [loadFailure, setLoadFailure] = useState<{ id: string; message: string } | null>(null);

  const effectiveOrder = id
    ? loadedOrder?.id === id ? loadedOrder : null
    : order || loadedOrder;
  const loadError = loadFailure?.id === id ? loadFailure?.message ?? null : null;
  const isLoadingOrder = Boolean(id && !effectiveOrder && !loadError);
  const loadedOrderIdRef = useRef<string | null>(null);

  const onClose = useCallback(() => {
    if (propOnClose) propOnClose();
    else navigate('/sales-order');
  }, [propOnClose, navigate]);

  const onSaveSuccess = useCallback(
    (savedId?: string, savedOrder?: Order) => {
      if (propOnSaveSuccess) propOnSaveSuccess(savedId, savedOrder);
      else navigate('/sales-order');
    },
    [propOnSaveSuccess, navigate]
  );

  // Bloqueia scroll do body enquanto o modal estiver aberto
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Recarrega a versão persistida: ações fiscais podem atualizar metadados enquanto a lista está aberta.
  useEffect(() => {
    if (!id) return;
    let isCurrent = true;
    setLoadedOrder(null);
    setLoadFailure(null);
    void withTimeout(fetchOrderById(id), 15_000, null, 'pedido:atualizar-antes-da-edicao')
      .then((ord) => {
        if (!isCurrent) return;
        if (ord?.id === id) {
          setLoadedOrder(ord);
          return;
        }
        setLoadFailure({ id, message: 'Não foi possível atualizar o pedido antes da edição. Feche e tente novamente.' });
        toast.error('Pedido não encontrado ou indisponível para edição.');
        if (shouldNavigateOnMissing) navigateRef.current('/sales-order');
      })
      .catch(() => {
        if (isCurrent) {
          setLoadFailure({ id, message: 'Não foi possível atualizar o pedido antes da edição. Feche e tente novamente.' });
          toast.error('Não foi possível carregar a versão atual do pedido.');
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [id, shouldNavigateOnMissing]);

  // Carrega o pedido no formulário e navega para o step inicial
  useEffect(() => {
    if (effectiveOrder && effectiveOrder.id && loadedOrderIdRef.current !== effectiveOrder.id) {
      loadedOrderIdRef.current = effectiveOrder.id;
      formActions.loadOrderForEditing(effectiveOrder);
      if (initialStep && initialStep > 1) {
        formActions.jumpToStep(initialStep);
      }
    }
  }, [effectiveOrder, formActions, initialStep]);

  return {
    effectiveOrder,
    isLoadingOrder,
    loadError,
    onClose,
    onSaveSuccess,
  };
}
