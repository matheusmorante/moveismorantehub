import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import CurrencyInput from '@/components/CurrencyInput';
import { calculatePurchaseItemCostBreakdown } from '@/pages/App/Stock/Purchases/utils/purchaseCalculationUtils';
import type { PurchaseItemsViewProps } from './PurchaseItemsViewProps';
import './PurchaseOrderItemsView.css';

interface Props extends PurchaseItemsViewProps {
  hasError: boolean;
  totalValue: number;
  activeItemIndex: number | null;
  onActiveItemChange?: (index: number | null) => void;
}

const ITEM_EXPANSION_DURATION_MS = 260;

const PurchaseOrderItemDetails = ({ expanded, children }: { expanded: boolean; children: React.ReactNode }) => {
  const mountedRef = useRef(expanded);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(expanded);
  const [visible, setVisible] = useState(expanded);

  useEffect(() => {
    if (containerRef.current) containerRef.current.inert = !expanded;
  }, [expanded]);

  useEffect(() => {
    if (expanded) {
      mountedRef.current = true;
      setMounted(true);
      if (typeof window.requestAnimationFrame === 'function') {
        const frame = window.requestAnimationFrame(() => setVisible(true));
        return () => window.cancelAnimationFrame(frame);
      }
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }

    setVisible(false);
    if (!mountedRef.current) return;
    const timer = window.setTimeout(() => {
      mountedRef.current = false;
      setMounted(false);
    }, ITEM_EXPANSION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  return (
    <div ref={containerRef} className={`purchase-order-expandable${visible ? ' is-open' : ''}`} aria-hidden={!expanded}>
      <div className="purchase-order-expandable-inner">{mounted ? children : null}</div>
    </div>
  );
};

const PurchaseOrderRemoveConfirmation = ({
  itemName,
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
}) => (
  <div className="purchase-order-remove-confirmation" role="alertdialog" aria-modal="true"
    aria-labelledby="purchase-order-remove-title" aria-describedby="purchase-order-remove-description">
    <div className="purchase-order-remove-copy">
      <strong id="purchase-order-remove-title">Você tem certeza que quer remover o item?</strong>
      <span id="purchase-order-remove-description">{itemName}</span>
    </div>
    <div className="purchase-order-remove-actions">
      <button type="button" onClick={onCancel} className="purchase-order-remove-cancel">Cancelar</button>
      <button type="button" onClick={onConfirm} disabled={confirmDisabled} className="purchase-order-remove-confirm">Confirmar</button>
    </div>
  </div>
);

export const PurchaseOrderItemsView = ({
  items, supplierId, discountPercent, ipiPercent, freightPercent, formatCurrency,
  onRemoveItem, canRemoveItems = true,
  onUpdateItem, onAddNewItemRow, handleSelectProductInRow,
  handleQtyChange, handleCostChange, hasError, totalValue, activeItemIndex,
  onActiveItemChange,
}: Props) => {
  const [showTable, setShowTable] = useState(false);
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const confirmRemoveItem = (index: number) => {
    if (!canRemoveItems || !items[index]) return;
    onRemoveItem(index);
    if (activeItemIndex === index) onActiveItemChange?.(null);
    else if (activeItemIndex !== null && activeItemIndex > index) onActiveItemChange?.(activeItemIndex - 1);
    setPendingRemoveIndex(null);
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setShowTable(node.clientWidth >= 1200);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const addItem = () => {
    onActiveItemChange?.(items.length);
    onAddNewItemRow();
  };

  const addButton = (className: string) => (
    <button type="button" onClick={addItem} disabled={!supplierId}
      className={`${className} items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30`}>
      <Plus size={14} aria-hidden="true" /> Adicionar item
    </button>
  );

  const productInput = (index: number, multiline = false) => {
    const item = items[index];
    return (
      <ProductAutocomplete
        supplierId={supplierId || undefined}
        multiline={multiline}
        value={item.description || ''}
        isSelected={Boolean(item.productId)}
        inputAriaLabel={`Produto do item ${index + 1}`}
        autoFocus={!item.productId}
        onChange={(description) => onUpdateItem?.(index, { ...item, productId: '', variationId: undefined, description })}
        onSelect={(product, variation) => handleSelectProductInRow(index, product, variation)}
        onSelectDescription={(description) => onUpdateItem?.(index, { ...item, description })}
        placeholder={supplierId ? 'Buscar produto deste fornecedor...' : 'Buscar produto...'}
        inputClassName={`h-10 w-full min-w-0 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-1 py-[0.55rem] text-sm font-bold outline-none focus:outline-none focus:ring-0 ${item.productId ? 'pr-9 border-emerald-500 text-slate-800 focus:border-emerald-600 dark:border-emerald-500 dark:text-slate-100' : 'border-slate-200 text-slate-800 focus:border-b-blue-600 dark:border-slate-700 dark:text-slate-100'}`}
      />
    );
  };

  return (
    <div ref={containerRef} className="purchase-order-items">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="min-w-0">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Itens do pedido ({items.length})</h3>
          {!supplierId && <p className="mt-1 text-xs text-amber-600">Selecione o fornecedor para adicionar itens.</p>}
          {hasError && <p className="mt-1 text-xs text-red-600">Adicione pelo menos um item ao pedido de compra.</p>}
        </div>
        {addButton('purchase-order-add-header')}
      </div>

      {!showTable && <div className="purchase-order-cards space-y-3 pt-3">
        {items.map((item, index) => {
          const costs = calculatePurchaseItemCostBreakdown(item, discountPercent, ipiPercent, freightPercent);
          const name = item.productId && item.description?.trim() ? item.description : 'Produto não informado';
          const expanded = activeItemIndex === index;
          const confirmingRemove = pendingRemoveIndex === index;
          return (
            <article key={index} onClick={() => { if (!expanded && !confirmingRemove) onActiveItemChange?.(index); }}
              className="purchase-order-card relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className={`purchase-order-card-content${confirmingRemove ? ' is-blurred' : ''}`} aria-hidden={confirmingRemove}>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Item {String(index + 1).padStart(2, '0')} · Produto</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label={`Remover item ${name}`} disabled={!canRemoveItems || confirmingRemove}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (canRemoveItems) setPendingRemoveIndex(index);
                      }}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30">
                      Remover item
                    </button>
                    <button type="button" aria-label={`${expanded ? 'Recolher' : 'Expandir'} item ${name}`}
                      aria-expanded={expanded} onClick={(event) => {
                        event.stopPropagation();
                        onActiveItemChange?.(expanded ? null : index);
                      }}
                      className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300">
                      {expanded ? <span>Recolher</span> : <ChevronDown size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                {expanded ? <div className="mt-1.5">{productInput(index, true)}</div> : (
                  <button type="button" onClick={() => onActiveItemChange?.(index)} aria-expanded={false}
                    className="mt-1 block w-full min-w-0 text-left">
                    <span className="block whitespace-normal break-words text-sm font-black text-slate-800 dark:text-slate-100">{name}</span>
                    <span className="mt-1 flex w-full min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs text-slate-500">{item.quantity} un. · {formatCurrency(costs.unitCost)}/un.</span>
                      <span className="shrink-0 whitespace-nowrap text-xs font-bold text-emerald-700 dark:text-emerald-400">Total do item {formatCurrency(costs.totalCost)}</span>
                    </span>
                  </button>
                )}
              </div>

              <PurchaseOrderItemDetails expanded={expanded}>
                <>
                  <div className="purchase-order-fields mt-4">
                    <label className="purchase-order-field">Quantidade
                      <input type="number" min="1" value={item.quantity} onChange={(event) => handleQtyChange(index, Number(event.target.value))} aria-label={`Quantidade de ${name}`} />
                    </label>
                    <label className="purchase-order-field" htmlFor={`order-base-card-${index}`}>Custo base un.
                      <CurrencyInput id={`order-base-card-${index}`} value={item.baseCost || 0} onChange={(value) => handleCostChange(index, value)} prefix="R$ " showBadge={false} className="purchase-order-money" />
                    </label>
                  </div>
                  <section className="purchase-order-composition mt-3" aria-label={`Composição do custo de ${name}`}>
                    <h4>Composição do custo por unidade</h4>
                    <div className="purchase-order-breakdown">
                      <div><span>Desconto un.</span><strong>{formatCurrency(costs.discountValue)}</strong></div>
                      <div><span>IPI un.</span><strong>{formatCurrency(costs.ipiValue)}</strong></div>
                      <div><span>Frete un.</span><strong>{formatCurrency(costs.freightValue)}</strong></div>
                      <div><span>Custo final un.</span><strong>{formatCurrency(costs.unitCost)}</strong></div>
                    </div>
                  </section>
                  <div className="purchase-order-item-total mt-3"><span>Total do item</span><strong>{formatCurrency(costs.totalCost)}</strong></div>
                </>
              </PurchaseOrderItemDetails>
              </div>
              {confirmingRemove && <div className="purchase-order-remove-overlay" onClick={(event) => event.stopPropagation()}>
                <PurchaseOrderRemoveConfirmation itemName={name} onCancel={() => setPendingRemoveIndex(null)} onConfirm={() => confirmRemoveItem(index)} confirmDisabled={!canRemoveItems} />
              </div>}
            </article>
          );
        })}
        {!items.length && <p className="py-5 text-center text-sm text-slate-500">Nenhum item adicionado ao pedido.</p>}
      </div>}

      {showTable && <div className="purchase-order-table mt-3 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col />
            <col style={{ width: '54px' }} />
            <col style={{ width: '104px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '72px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '66px' }} />
          </colgroup>
          <thead className="bg-slate-50 uppercase tracking-wider text-slate-500 dark:bg-slate-900">
            <tr>{['Produto', 'Qtd.', 'Custo base un.', 'Desconto un.', 'IPI un.', 'Frete un.', 'Custo final un.', 'Total do item', 'Ações'].map((label, i) => <th key={i} className="px-1.5 py-3">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item, index) => {
              const costs = calculatePurchaseItemCostBreakdown(item, discountPercent, ipiPercent, freightPercent);
              const name = item.productId && item.description?.trim() ? item.description : 'Produto não informado';
              const confirmingRemove = pendingRemoveIndex === index;
              return <React.Fragment key={index}>
                <tr onClick={() => onActiveItemChange?.(index)} aria-selected={activeItemIndex === index}
                  className={`${activeItemIndex === index ? 'bg-blue-50/70 dark:bg-slate-800/60' : ''}${confirmingRemove ? ' purchase-order-table-row-blurred' : ''}`}>
                  <td className="min-w-[300px] px-1.5 py-2 align-top">{productInput(index, true)}</td>
                  <td className="px-1.5 py-2"><input type="number" min="1" value={item.quantity} aria-label={`Quantidade de ${name}`} onChange={(event) => handleQtyChange(index, Number(event.target.value))} className="purchase-order-money w-full" /></td>
                  <td className="px-1.5 py-2"><label className="sr-only" htmlFor={`order-base-table-${index}`}>Custo base por unidade de {name}</label><CurrencyInput id={`order-base-table-${index}`} value={item.baseCost || 0} onChange={(value) => handleCostChange(index, value)} prefix="R$ " showBadge={false} className="purchase-order-money w-full" /></td>
                  <td className="whitespace-nowrap px-1.5 py-2">{formatCurrency(costs.discountValue)}</td>
                  <td className="whitespace-nowrap px-1.5 py-2">{formatCurrency(costs.ipiValue)}</td>
                  <td className="whitespace-nowrap px-1.5 py-2">{formatCurrency(costs.freightValue)}</td>
                  <td className="px-1.5 py-2 font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(costs.unitCost)}</td>
                  <td className="px-1.5 py-2 font-black text-slate-800 dark:text-slate-100">{formatCurrency(costs.totalCost)}</td>
                  <td className="px-1.5 py-2">
                    <button type="button" aria-label={`Remover item ${name}`} disabled={!canRemoveItems || confirmingRemove}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (canRemoveItems) setPendingRemoveIndex(index);
                      }}
                      className="whitespace-nowrap font-bold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300">
                      Remover
                    </button>
                  </td>
                </tr>
                {confirmingRemove && <tr>
                  <td colSpan={9} className="purchase-order-table-confirmation-cell">
                    <PurchaseOrderRemoveConfirmation itemName={name} onCancel={() => setPendingRemoveIndex(null)} onConfirm={() => confirmRemoveItem(index)} confirmDisabled={!canRemoveItems} />
                  </td>
                </tr>}
              </React.Fragment>;
            })}
            {!items.length && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">Nenhum item adicionado ao pedido.</td></tr>}
          </tbody>
        </table>
      </div>}
      {addButton('purchase-order-add-footer mt-3 w-full border border-dashed border-slate-300 dark:border-slate-700')}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
        <span className="text-sm font-bold">Total do pedido</span><strong>{formatCurrency(totalValue)}</strong>
      </div>
    </div>
  );
};
