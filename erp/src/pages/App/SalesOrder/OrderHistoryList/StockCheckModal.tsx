import React, { useState, useEffect, useRef } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import Order, { AssistanceItem } from '../../../types/order.type';
import { Item } from '../../../types/items.type';
import { formatOrderCode } from '../../../utils/orderCode';
import { createStockLabelingFormSchema } from '../../../../../../shared-utils/operationsFormSchemas';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly order: Order;
  readonly onStockCheckUpdate: (
    id: string,
    value: boolean,
    updatedItems?: readonly Item[],
    updatedAssistanceItems?: readonly AssistanceItem[]
  ) => void | boolean | Promise<void | boolean>;
}

const StockCheckModal = ({ isOpen, onClose, order, onStockCheckUpdate }: Props) => {
  const items: ((Item | AssistanceItem) & { isStockChecked?: boolean })[] = [...(order.items || []), ...(order.assistanceItems || [])];

  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    items.forEach((item, idx) => {
      const isItemChecked =
        'isStockChecked' in item && Boolean((item as { isStockChecked?: boolean }).isStockChecked);
      if (isItemChecked || order.isStockChecked) {
        initial[idx] = true;
      }
    });
    return initial;
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false), active = useRef(true), uncertain = useRef(new Set<string>());
  const sourceKey = JSON.stringify([order.id, order.updatedAt, items.map(({ isStockChecked: _checked, ...item }) => item)]);
  const selectionSource = useRef({ items, orderChecked: order.isStockChecked, orderId: order.id });
  selectionSource.current = { items, orderChecked: order.isStockChecked, orderId: order.id };
  const context = useRef({ isOpen, sourceKey });
  if (context.current.isOpen !== isOpen || context.current.sourceKey !== sourceKey) context.current = { isOpen, sourceKey };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!isOpen) return;
    const source = selectionSource.current;
    setCheckedItems(Object.fromEntries(source.items.map((item, index) => [index, Boolean(item.isStockChecked || source.orderChecked)])));
    setFormError(uncertain.current.has(source.orderId || '') ? 'Há uma etiquetagem sem confirmação. Confira o pedido antes de repetir.' : '');
  }, [isOpen, sourceKey]);
  const formValues = { orderId: order.id || '', checkedItems: items.map((_, index) => Boolean(checkedItems[index])) };
  const form = useZodForm(createStockLabelingFormSchema(items.length), formValues);
  const close = () => { if (!inFlight.current) onClose(); };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inFlight.current) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleItem = (index: number) => {
    if (inFlight.current) return;
    setCheckedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleAll = () => {
    if (inFlight.current) return;
    const allChecked = items.every((_, idx) => checkedItems[idx]);
    const newState: Record<number, boolean> = {};
    if (!allChecked) {
      items.forEach((_, idx) => {
        newState[idx] = true;
      });
    }
    setCheckedItems(newState);
  };

  const handleConfirm = async () => {
    if (inFlight.current || uncertain.current.has(order.id || '')) return;
    inFlight.current = true; setSaving(true);
    const submitted = context.current;
    setFormError('');
    try { await form.validateAndRun(formValues, async (validated) => {
      if (!active.current || context.current !== submitted) return;
      const updatedItems = (order.items || []).map((item, idx) => ({
        ...item,
        isStockChecked: validated.checkedItems[idx],
      }));
      const updatedAssistanceItems = (order.assistanceItems || []).map((item, idx) => {
        const realIdx = (order.items || []).length + idx;
        return { ...item, isStockChecked: validated.checkedItems[realIdx] };
      });
      const allChecked = [...updatedItems, ...updatedAssistanceItems].every((item) => item.isStockChecked);
      try {
        const saved = await withTimeout(Promise.resolve(onStockCheckUpdate(validated.orderId, allChecked, updatedItems, updatedAssistanceItems)).then((result) => result !== false), 30000, false, 'pedido:salvar-etiquetagem');
        if (!saved) { uncertain.current.add(validated.orderId); throw new Error('Não foi possível confirmar a etiquetagem. Confira o pedido antes de repetir.'); }
        if (active.current && context.current === submitted) onClose();
      } catch (cause) {
        uncertain.current.add(validated.orderId);
        if (active.current && context.current === submitted) setFormError(cause instanceof Error ? cause.message : 'Não foi possível salvar a etiquetagem.');
      }
    }, (errors) => setFormError(Object.values(flattenFormErrors(errors))[0] || 'Revise a etiquetagem dos itens.'));
    } finally { inFlight.current = false; if (active.current) setSaving(false); }
  };

  const isAllChecked = items.length > 0 && items.every((_, idx) => checkedItems[idx]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal de etiquetagem de itens"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={close}
        disabled={saving}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-check-title"
        className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2.5 rounded-2xl">
              <i className="bi bi-box-seam text-2xl" />
            </div>
            <div>
              <h2 id="stock-check-title" className="text-xl font-black tracking-tight">
                Etiquetar Itens
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
            disabled={saving}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <i className="bi bi-x-lg text-xl" />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {formError && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">{formError}</div>}
          {saving && <p role="status" className="text-sm text-indigo-700 dark:text-indigo-300"><i className="bi bi-arrow-repeat animate-spin mr-2" aria-hidden="true" />Confirmando a etiquetagem dos itens...</p>}
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Itens do Pedido ({items.length})
            </span>
            <button
              type="button"
              onClick={toggleAll}
              disabled={saving}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:opacity-80 flex items-center gap-1"
            >
              <i className={`bi ${isAllChecked ? 'bi-check-square-fill' : 'bi-square'}`} />
              {isAllChecked ? 'Desmarcar Tudo' : 'Marcar Tudo'}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                role="checkbox"
                aria-checked={!!checkedItems[idx]}
                aria-disabled={saving}
                tabIndex={0}
                onClick={() => toggleItem(idx)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleItem(idx);
                  }
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  checkedItems[idx]
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/30'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {item.description || 'Produto sem descrição'}
                  </span>
                  {'variationLabel' in item &&
                    Boolean((item as { variationLabel?: string }).variationLabel) && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-fit text-slate-500 dark:text-slate-400">
                        {(item as { variationLabel?: string }).variationLabel}
                      </span>
                    )}
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    Qtd: {item.quantity}
                  </span>
                </div>

                <div
                  className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                    checkedItems[idx]
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  {checkedItems[idx] && <i className="bi bi-check-lg text-sm font-black" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || uncertain.current.has(order.id || '')}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
          >
            <i className="bi bi-check2-circle text-sm" />
            Concluir Etiquetagem
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockCheckModal;
