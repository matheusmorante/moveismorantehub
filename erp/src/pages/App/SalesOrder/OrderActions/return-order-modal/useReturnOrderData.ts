import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { Item } from '../../../../types/items.type';
import type Order from '../../../../types/order.type';
import { findAuthorizedFiscalDocument } from '../../../../utils/nfe/findAuthorizedFiscalDocument';
import {
  type AvailableInvoiceLine,
  getBilledCapacityByOrderLine,
} from '../../../../utils/nfe/invoiceLineSnapshot';
import {
  getReturnableQuantities,
  getReturnLineKey,
  type ReturnQuantityRecord,
} from '../../../../utils/returnQuantityRules';
import { supabase } from '../../../../utils/supabaseConfig';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

export const useReturnOrderData = (order: Order) => {
  const [returnableQuantities, setReturnableQuantities] = useState<Record<string, number>>({});
  const [returnsLoaded, setReturnsLoaded] = useState(false);
  const [returnDataError, setReturnDataError] = useState<string | null>(null);
  const [fiscalCapacityLines, setFiscalCapacityLines] = useState<AvailableInvoiceLine[]>([]);
  const [fiscalCapacityLoaded, setFiscalCapacityLoaded] = useState(false);
  const [fiscalCapacityError, setFiscalCapacityError] = useState<string | null>(null);
  const [hasAuthorizedInvoice, setHasAuthorizedInvoice] = useState(false);
  const priorReturnsRef = useRef<ReturnQuantityRecord[]>([]);

  useEffect(() => {
    let active = true;
    const loadReturnData = async () => {
      if (!order.id) {
        throw new Error('A devolução comercial exige uma venda original já cadastrada.');
      }
      setReturnsLoaded(false);
      setFiscalCapacityLoaded(false);
      setFiscalCapacityError(null);
      setReturnDataError(null);
      priorReturnsRef.current = [];

      // 1. Carrega devoluções comerciais anteriores (para controle de itens devolvíveis)
      let priorReturns: Array<{ status?: string; items: Item[] }>;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status,items,order_data')
          .eq('order_type', 'return')
          .or(`linked_order_id.eq.${order.id},order_data->>linkedOrderId.eq.${order.id}`);
        if (!active) return;
        if (error) {
          throw new Error('Não foi possível conferir o saldo já devolvido. Reabra a devolução comercial.', {
            cause: error,
          });
        } else {
          priorReturns = (data || []).map((row: any) => ({
            status: row.status || row.order_data?.status,
            items: row.items || row.order_data?.items || [],
          }));
        }
      } catch (err) {
        throw new Error('Não foi possível conferir o saldo já devolvido. Reabra a devolução comercial.', {
          cause: err,
        });
      }

      if (!active) return;
      priorReturnsRef.current = priorReturns;
      const remaining = getReturnableQuantities(order.items || [], priorReturns);

      // 2. Localiza NF-e/NFC-e original efetivamente AUTORIZADA
      const authorizedDoc = await findAuthorizedFiscalDocument(order.id, { throwOnError: true });
      if (!active) return;

      if (!authorizedDoc) {
        // Venda sem nota fiscal autorizada (ou rejeitada/cancelada/nenhuma)
        setHasAuthorizedInvoice(false);
        setFiscalCapacityLines([]);
        setFiscalCapacityError(null);
        setFiscalCapacityLoaded(true);
        setReturnableQuantities(
          Object.fromEntries(
            remaining.map((quantity, index) => [
              getReturnLineKey(order.items[index], index),
              quantity,
            ])
          )
        );
        setReturnsLoaded(true);
        return;
      }

      setHasAuthorizedInvoice(true);

      // 3. Somente se existir documento fiscal autorizado: consulta capacidade fiscal via backend
      let loadedHasAuthorizedInvoice = true;
      let loadedFiscalLines: AvailableInvoiceLine[] = [];
      try {
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session.session?.access_token)
          throw new Error('Faça login novamente para conferir as NF-e de origem.');
        const response = await fetch('/api/nfe/return-capacity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ orderId: order.id, environment: authorizedDoc.ambiente }),
        });
        const result = await response.json();
        if (!response.ok || !result.success)
          throw new Error(result.error || 'Não foi possível conferir o saldo faturado.');
        if (!active) return;
        loadedHasAuthorizedInvoice = Boolean(
          result.hasAuthorizedInvoice ?? result.hasAuthorizedProductionInvoice
        );
        loadedFiscalLines = result.lines || [];
        setHasAuthorizedInvoice(loadedHasAuthorizedInvoice);
        setFiscalCapacityLines(loadedFiscalLines);
      } catch (error: any) {
        if (!active) return;
        setFiscalCapacityError(error.message || 'Não foi possível conferir o saldo fiscal.');
        toast.warning('O saldo fiscal da NF-e autorizada não pôde ser conferido no momento.');
      } finally {
        if (active) setFiscalCapacityLoaded(true);
      }

      if (!active) return;
      const billedCapacity = loadedHasAuthorizedInvoice
        ? getBilledCapacityByOrderLine(order.items || [], loadedFiscalLines)
        : null;
      setReturnableQuantities(
        Object.fromEntries(
          remaining.map((quantity, index) => [
            getReturnLineKey(order.items[index], index),
            billedCapacity ? Math.min(quantity, billedCapacity[index] || 0) : quantity,
          ])
        )
      );
      setReturnsLoaded(true);
    };

    const showLoadError = (message: string) => {
      if (!active) return;
      active = false;
      setReturnDataError(message);
      setReturnsLoaded(true);
      setFiscalCapacityLoaded(true);
    };

    void withTimeout(
      loadReturnData().then(() => true),
      15_000,
      false,
      'conferência da devolução comercial'
    )
      .then((completed) => {
        if (!completed)
          showLoadError(
            'A conferência dos saldos demorou mais que o esperado. Reabra a devolução comercial para tentar novamente.'
          );
      })
      .catch((error: unknown) =>
        showLoadError(
          error instanceof Error ? error.message : 'Não foi possível conferir a devolução comercial.'
        )
      );

    return () => {
      active = false;
    };
  }, [order.id, order.items]);

  return {
    returnableQuantities,
    returnsLoaded,
    returnDataError,
    fiscalCapacityLines,
    fiscalCapacityLoaded,
    fiscalCapacityError,
    hasAuthorizedInvoice,
    priorReturnsRef,
  };
};
