import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { fetchOrderById } from '@/pages/utils/orderHistoryService';
import type { useSalesOrderForm } from '../../../hooks/useSalesOrderForm';

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

  const id = orderId || paramId;
  const [loadedOrder, setLoadedOrder] = useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(!!id && !order);

  const effectiveOrder = order || loadedOrder;
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

  // Busca o pedido caso tenha sido informado apenas o ID
  useEffect(() => {
    if (id && !order) {
      setIsLoadingOrder(true);
      fetchOrderById(id).then((ord) => {
        if (ord) {
          setLoadedOrder(ord);
        } else {
          toast.error('Pedido não encontrado.');
          if (!orderId) navigate('/sales-order');
        }
        setIsLoadingOrder(false);
      });
    }
  }, [id, order, navigate, orderId]);

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
    onClose,
    onSaveSuccess,
  };
}
