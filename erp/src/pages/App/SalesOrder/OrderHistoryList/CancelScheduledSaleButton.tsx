import React, { useState } from 'react';
import Order from '../../../types/order.type';
import CancelSaleModal from './CancelSaleModal';
import { canCancelOrderDirectly } from '@/pages/utils/orderStatusTransitionRules';
import { supabase } from '@/pages/utils/supabaseConfig';

type Props = {
  order: Order;
  onStatusUpdate: (id: string, status: Order['status']) => void;
  onCloseMenu: () => void;
};

const CancelScheduledSaleButton = ({ order, onStatusUpdate, onCloseMenu }: Props) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<null | { action: 'none' | 'cancel' | 'estorno' | 'manual_review'; hasAuthorizedInvoice: boolean; model?: string; reason?: string }>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const orderType = order.orderType || 'sale';
  if (!['sale', 'showroom'].includes(orderType)) return null;
  if (!canCancelOrderDirectly(order) || !order.id) return null;

  const prepareCancellation = async () => {
    setPreviewLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) throw new Error('Sessão indisponível.');
      const response = await fetch('/api/nfe/order-cancellation-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ orderId: order.id, preview: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível consultar as consequências fiscais.');
      setPreview(result);
      setIsConfirmOpen(true);
    } catch (error) {
      console.error('Falha ao consultar prévia de cancelamento:', error);
      window.alert(error instanceof Error ? error.message : 'Não foi possível consultar as consequências fiscais.');
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
        title="Cancelar venda agendada"
      >
        <i className="bi bi-x-circle-fill text-lg shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest">{previewLoading ? 'Consultando...' : 'Cancelar venda'}</span>
      </button>
      {isConfirmOpen && (
        <CancelSaleModal
          order={order}
          preview={preview!}
          onCancel={() => {
            setIsConfirmOpen(false);
            onCloseMenu();
          }}
          onConfirm={() => {
            onStatusUpdate(order.id!, 'cancelled');
            setIsConfirmOpen(false);
            onCloseMenu();
          }}
        />
      )}
    </>
  );
};

export default CancelScheduledSaleButton;
