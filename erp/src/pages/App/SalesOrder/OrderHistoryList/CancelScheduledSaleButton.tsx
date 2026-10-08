import React, { useState } from 'react';
import Order from '../../../types/order.type';
import CancelSaleModal from './CancelSaleModal';
import { supabase } from '@/pages/utils/supabaseConfig';
import { parseNfeApiResponse } from '@/pages/utils/nfe/parseNfeApiResponse';
import { mapOrderFromDatabase } from '@/pages/utils/orderMapper';
import { getGoodsCirculationState } from '@/pages/utils/nfe/cancellationEligibility';

type Props = {
  order: Order;
  onStatusUpdate: (
    id: string,
    status: Order['status'],
    options?: { productionConfirmed?: boolean }
  ) => void;
  onAction: (actionKey: string, order: Order) => void;
  onEdit: (order: Order) => void;
  onCloseMenu: () => void;
};

type PreviewAction =
  | 'none'
  | 'cancel'
  | 'estorno'
  | 'return'
  | 'manual_review'
  | 'blocked'
  | 'pending'
  | 'reconcile'
  | 'batch';

const CancelScheduledSaleButton = ({
  order,
  onStatusUpdate,
  onAction,
  onEdit,
  onCloseMenu,
}: Props) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<null | {
    action: PreviewAction;
    hasAuthorizedInvoice: boolean;
    model?: string;
    environment?: 1 | 2;
    reason?: string;
    returnOrderId?: string;
    returnOrderStatus?: string;
    operations?: Array<{ action: string; documentId: string; environment?: 1 | 2; model?: string; reason?: string }>;
  }>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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
    setPreviewLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session?.access_token) throw new Error('Sessão indisponível.');
      const response = await fetch('/api/nfe/order-cancellation-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id, preview: true }),
      });
      const result = await parseNfeApiResponse<{
        action: PreviewAction;
        hasAuthorizedInvoice: boolean;
        model?: string;
        environment?: 1 | 2;
        reason?: string;
        returnOrderId?: string;
        returnOrderStatus?: string;
        operations?: Array<{ action: string; documentId: string; environment?: 1 | 2; model?: string; reason?: string }>;
        error?: string;
      }>(response, 'Não foi possível consultar as consequências fiscais.');
      if (!response.ok)
        throw new Error(result.error || 'Não foi possível consultar as consequências fiscais.');
      setPreview(result);
      setIsConfirmOpen(true);
    } catch (error) {
      console.error('Falha ao consultar prévia de cancelamento:', error);
      window.alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar as consequências fiscais.'
      );
    } finally {
      setPreviewLoading(false);
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
        title="Consultar cancelamento ou devolução da venda"
      >
        <i className="bi bi-x-circle-fill text-lg shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest">
          {previewLoading ? 'Consultando...' : 'Cancelar venda'}
        </span>
      </button>
      {isConfirmOpen && (
        <CancelSaleModal
          order={order}
          preview={preview!}
          onCancel={() => {
            setIsConfirmOpen(false);
            onCloseMenu();
          }}
          onConfirm={async ({ productionConfirmed }) => {
            if (preview?.action === 'return') {
              setIsConfirmOpen(false);
              onCloseMenu();
              if (preview.returnOrderId) {
                const { data, error } = await supabase
                  .from('orders')
                  .select('*')
                  .eq('id', preview.returnOrderId)
                  .maybeSingle();
                if (error || !data) {
                  window.alert('A devolução vinculada não foi encontrada. Atualize a lista e tente novamente.');
                  return;
                }
                const returnOrder = mapOrderFromDatabase(data);
                if (returnOrder.status === 'fulfilled') {
                  onAction('openReturnNfe', returnOrder);
                } else {
                  onEdit(returnOrder);
                }
              } else {
                onAction('generateReturn', order);
              }
              return;
            }
            if (
              !preview ||
              !['none', 'cancel', 'estorno'].includes(preview.action)
            ) {
              setIsConfirmOpen(false);
              onCloseMenu();
              return;
            }
            onStatusUpdate(order.id!, 'cancelled', { productionConfirmed });
            setIsConfirmOpen(false);
            onCloseMenu();
          }}
        />
      )}
    </>
  );
};

export default CancelScheduledSaleButton;
