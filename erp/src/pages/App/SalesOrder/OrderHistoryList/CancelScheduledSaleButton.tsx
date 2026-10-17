import React, { useEffect, useRef, useState } from 'react';
import Order from '../../../types/order.type';
import CancelSaleModal from './CancelSaleModal';
import { supabase } from '@/pages/utils/supabaseConfig';
import { parseNfeApiResponse } from '@/pages/utils/nfe/parseNfeApiResponse';
import { mapOrderFromDatabase } from '@/pages/utils/orderMapper';
import { getGoodsCirculationState } from '@/pages/utils/nfe/cancellationEligibility';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { saleCancellationPreviewRequestSchema, saleCancellationPreviewSchema, type SaleCancellationPreview } from '../../../../../../shared-utils/saleCancellationFormSchemas';

type Props = {
  order: Order;
  onStatusUpdate: (
    id: string,
    status: Order['status'],
    options?: { productionConfirmed?: boolean; isCurrent?: () => boolean }
  ) => void | boolean | Promise<void | boolean>;
  onAction: (actionKey: string, order: Order) => void;
  onEdit: (order: Order) => void;
  onCloseMenu: () => void;
};

const CancelScheduledSaleButton = ({
  order,
  onStatusUpdate,
  onAction,
  onEdit,
  onCloseMenu,
}: Props) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<SaleCancellationPreview | null>(null);
  const [previewOrderId, setPreviewOrderId] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const previewForm = useZodForm(saleCancellationPreviewRequestSchema, { orderId: order.id || '' });
  const queryInFlight = useRef(false), confirmationInFlight = useRef(false), active = useRef(true);
  const requestController = useRef<AbortController | null>(null);
  const contextKey = JSON.stringify([order.id, order.updatedAt, order.status]);
  const context = useRef(contextKey); context.current = contextKey;
  useEffect(() => { active.current = true; return () => { active.current = false; requestController.current?.abort(); }; }, []);
  useEffect(() => { requestController.current?.abort(); setIsConfirmOpen(false); setPreview(null); setPreviewError(''); setPreviewLoading(false); }, [contextKey]);

  const orderType = order.orderType || 'sale';
  if (!['sale', 'showroom'].includes(orderType)) return null;
  const orderStatus = String(order.status || '').toLowerCase();
  const canInspectCancellation =
    ['scheduled', 'agendado', 'aguardando retirada'].includes(orderStatus) ||
    getGoodsCirculationState(order) !== 'none';
  if (
    ['cancelled', 'cancelado', 'draft'].includes(orderStatus) ||
    !canInspectCancellation ||
    !order.id
  )
    return null;

  const prepareCancellation = async () => {
    if (queryInFlight.current || confirmationInFlight.current) return;
    queryInFlight.current = true;
    setPreviewLoading(true);
    setPreviewError('');
    const isCurrent = () => active.current && context.current === contextKey;
    try {
      await previewForm.validateAndRun({ orderId: order.id || '' }, async ({ orderId }) => {
        if (!isCurrent()) return false;
        const {
          data: { session },
          error,
        } = await withTimeout(supabase.auth.getSession(), 10_000, { data: { session: null }, error: null }, 'venda:sessao-previa-cancelamento');
        if (!isCurrent()) return false;
        if (error || !session?.access_token) throw new Error('Sessão indisponível.');
        const controller = new AbortController(); requestController.current = controller;
        const result = await withTimeout((async () => {
          const response = await fetch('/api/nfe/order-cancellation-policy', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ orderId, preview: true }),
          });
          const result = await parseNfeApiResponse<SaleCancellationPreview & { error?: string }>(response, 'Não foi possível consultar as consequências fiscais.');
          if (!response.ok)
            throw new Error(result.error || 'Não foi possível consultar as consequências fiscais.');
          const parsed = saleCancellationPreviewSchema.safeParse(result);
          if (!parsed.success) throw new Error('A consulta retornou consequências fiscais incompletas. Atualize e consulte novamente.');
          return parsed.data;
        })(), 15_000, null, 'venda:previa-cancelamento');
        controller.abort();
        if (!isCurrent()) return false;
        if (!result) throw new Error('A consulta fiscal excedeu o prazo. Tente novamente.');
        setPreview(result); setPreviewOrderId(orderId);
        setIsConfirmOpen(true);
        return true;
      }, errors => { if (isCurrent()) setPreviewError(Object.values(flattenFormErrors(errors))[0] || 'Confira a venda.'); });
    } catch (error) {
      if (isCurrent()) setPreviewError(
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar as consequências fiscais.'
      );
    } finally {
      requestController.current?.abort(); queryInFlight.current = false;
      if (active.current) setPreviewLoading(false);
    }
  };

  return (
    <>
      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void prepareCancellation();
        }}
        disabled={previewLoading}
        className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-rose-600 transition-all hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 cursor-pointer"
        title="Consultar cancelamento comercial ou devolução comercial da venda"
      >
        <i className="bi bi-x-circle-fill text-lg shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest">
          {previewLoading ? 'Consultando...' : 'Cancelar venda'}
        </span>
      </button>
      {previewLoading && <p role="status" className="px-2.5 text-xs text-slate-600 dark:text-slate-300"><i className="bi bi-arrow-repeat animate-spin mr-2" />Consultando as consequências fiscais...</p>}
      {previewError && <p role="alert" className="px-2.5 text-xs text-rose-700 dark:text-rose-300">{previewError}</p>}
      {isConfirmOpen && (
        <CancelSaleModal
          order={order}
          preview={preview!}
          onCancel={() => {
            setIsConfirmOpen(false);
            onCloseMenu();
          }}
          onConfirm={async ({ productionConfirmed }, stillCurrent) => {
            if (confirmationInFlight.current || !stillCurrent() || context.current !== contextKey) return false;
            confirmationInFlight.current = true;
            const knownFailure = (message: string) => Object.assign(new Error(message), { knownFailure: true });
            const closeConfirmed = () => { if (stillCurrent() && context.current === contextKey) { setIsConfirmOpen(false); onCloseMenu(); } };
            try {
              if (preview?.action === 'return') {
                if (preview.returnOrderId) {
                  const result = await withTimeout(supabase
                    .from('orders')
                    .select('*')
                    .eq('id', preview.returnOrderId)
                    .maybeSingle(), 15_000, null, 'venda:consultar-devolucao-vinculada');
                  if (!stillCurrent()) return false;
                  if (!result || result.error || !result.data || result.data.id !== preview.returnOrderId) throw knownFailure('A devolução comercial vinculada não foi encontrada ou não respondeu no prazo. Atualize a lista e tente novamente.');
                  const { data } = result;
                  const returnOrder = mapOrderFromDatabase(data);
                  if (returnOrder.status === 'fulfilled') {
                    await onAction('openReturnNfe', returnOrder);
                  } else {
                    await onEdit(returnOrder);
                  }
                } else {
                  await onAction('generateReturn', { ...order, id: previewOrderId });
                }
                closeConfirmed(); return true;
              }
              if (
                !preview ||
                !['none', 'cancel', 'estorno'].includes(preview.action)
              ) {
                throw knownFailure('A situação fiscal exige conferência antes de confirmar esta operação.');
              }
              const receipt = await onStatusUpdate(previewOrderId, 'cancelled', { productionConfirmed, isCurrent: stillCurrent });
              if (receipt !== true) throw new Error('O cancelamento comercial não foi confirmado. Consulte o histórico antes de repetir.');
              closeConfirmed(); return true;
            } finally { confirmationInFlight.current = false; }
          }}
        />
      )}
    </>
  );
};

export default CancelScheduledSaleButton;
