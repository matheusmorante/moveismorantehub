import React, { useState, useEffect, useRef } from 'react';
import Order from '../../../types/order.type';
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { orderInventoryActionFormSchema } from '../../../../../../shared-utils/inventoryMoveSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { formatOrderCode } from '@/pages/utils/orderCode';
import { isStockEligibleSaleItem } from '@/pages/utils/saleInventoryRules';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly order: Order;
  readonly type: 'withdrawal' | 'entry'; // withdrawal = lancar saida, entry = estornar (volta pro estoque)
}

const StockActionModal = (props: Props) => {
  if (!props.isOpen) return null;
  const items = (props.order.items || []).filter(isStockEligibleSaleItem).map((item) => ({
    productId: item.productId, variationId: item.variationId || undefined,
    productDescription: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
  }));
  return <StockActionEditor key={JSON.stringify([props.order.id, props.type, items])} {...props} items={items} />;
};
function StockActionEditor({ onClose, order, type, items }: Props & {
  items: { productId: string; variationId?: string; productDescription: string; quantity: number; unitPrice?: number }[];
}) {
  useBodyScrollLock(true);
  const [observation, setObservation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [completed, setCompleted] = useState(0);
  const locked = useRef(false), blocked = useRef(false), mounted = useRef(false);
  const values = { reason: observation, orderId: order.id || '', type, items };
  const form = useZodForm(orderInventoryActionFormSchema, values);
  const close = () => { if (!locked.current) onClose(); };
  useEffect(() => {
    mounted.current = true;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !locked.current) onClose(); };
    window.addEventListener('keydown', escape);
    return () => { mounted.current = false; window.removeEventListener('keydown', escape); };
  }, [onClose]);

  const title =
    type === 'withdrawal' ? 'Lançar Saída de Estoque' : 'Estornar Lançamento de Estoque';
  const actionLabel = type === 'withdrawal' ? 'Lançar Saída' : 'Confirmar Estorno';
  const icon = type === 'withdrawal' ? 'bi-box-arrow-right' : 'bi-arrow-counterclockwise';
  const color =
    type === 'withdrawal' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700';

  const handleConfirm = async () => {
    if (locked.current || blocked.current) return;
    locked.current = true; setIsSaving(true); setError(''); setCompleted(0);
    let confirmed = 0;
    try {
      await form.validateAndRun(values, async (data) => {
        const date = new Date().toISOString();
        for (const item of data.items) {
          if (!mounted.current) return;
          const move = { ...item, type: data.type, date,
            label: data.type === 'withdrawal' ? `Saída - Pedido #${formatOrderCode(order)}` : `Estorno - Pedido #${formatOrderCode(order)}`,
            observation: data.reason, relatedEntityId: data.orderId, relatedEntityType: 'sales_order' as const,
          };
          const response = await withTimeout(saveInventoryMove(move, 0).then((saved) => ({ saved })), 30_000, null, 'estoque:pedido');
          if (!mounted.current) return;
          if (!response?.saved?.id) throw { uncertain: true };
          confirmed += 1; setCompleted(confirmed);
        }
        if (!mounted.current) return;
        toast.success(`${data.type === 'withdrawal' ? 'Saída lançada' : 'Estorno realizado'} com sucesso!`);
        onClose();
      }, (errors) => {
        if (!mounted.current) return;
        const [field, detail] = Object.entries(flattenFormErrors(errors))[0] || ['', 'Confira a movimentação.'];
        const itemIndex = /^items_(\d+)_/.exec(field)?.[1];
        const message = itemIndex === undefined ? detail : `Item ${Number(itemIndex) + 1}: ${detail} Revise os itens do pedido.`;
        setError(message); toast.error(message);
      });
    } catch (cause) {
      if (!mounted.current) return;
      const details = cause as { uncertain?: boolean; persistedMoveId?: string };
      const unknown = details?.uncertain || cause instanceof TypeError;
      const unresolved = confirmed > 0 || unknown;
      if (unresolved) { blocked.current = true; setUncertain(true); }
      setError(unresolved
        ? `${confirmed} de ${items.length} movimentos concluídos. ${details?.persistedMoveId ? 'Outro movimento foi gravado com saldo pendente.' : unknown ? 'O resultado do próximo movimento não foi confirmado.' : 'O lote foi interrompido antes de concluir os movimentos restantes.'} Consulte os movimentos e os saldos antes de repetir.`
        : 'Não foi possível gravar a movimentação. Confira os dados e as permissões.');
    } finally {
      locked.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overscroll-contain overflow-y-auto">
      <button
        type="button"
        aria-label="Fechar modal de movimentação de estoque"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-action-title"
        className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-8 ${color} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2.5 rounded-2xl">
              <i className={`bi ${icon} text-2xl`} />
            </div>
            <div>
              <h2 id="stock-action-title" className="text-xl font-black tracking-tight">
                {title}
              </h2>
              <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest mt-0.5">
                Pedido #{formatOrderCode(order)}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={close}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <i className="bi bi-x-lg text-xl" />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {isSaving && <p role="status" className="text-sm animate-pulse">Gravando movimentos: {completed} de {items.length} concluídos…</p>}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="stock-action-reason"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500"
            >
              Motivo de {type === 'withdrawal' ? 'Saída' : 'Estorno'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              id="stock-action-reason"
              autoFocus
              disabled={isSaving || uncertain}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva o motivo desta ação..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100 min-h-[100px] resize-none"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
            <i className="bi bi-info-circle-fill text-blue-600 dark:text-blue-400 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
              Esta ação irá {type === 'withdrawal' ? 'dar baixa no' : 'estornar para o'} estoque
              atual de todos os itens deste pedido.
            </p>
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || uncertain}
            className={`px-8 py-3 ${color} text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none`}
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StockActionModal;
