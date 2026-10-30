import React, { useState } from 'react';
import type Item from '../../../types/items.type';
import { calcItemTotalValue } from '../../../utils/calculations';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import UnitInput from './UnitInput';

export interface IndexedCompositionItem {
  item: Item;
  originalIndex: number;
}

interface CompositionGroupRowProps {
  items: IndexedCompositionItem[];
  lineNumber: number;
  isMobile: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onQuantityChange: (quantity: number) => void;
  onDelete: () => void;
  columnCount: number;
  hasPending: boolean;
  quantityError?: string;
  children: (
    expandedComponentId: string | null,
    toggleComponent: (itemId: string) => void
  ) => React.ReactNode;
}

const CompositionGroupRow: React.FC<CompositionGroupRowProps> = ({
  items,
  lineNumber,
  isMobile,
  isExpanded,
  onToggleExpand,
  onQuantityChange,
  onDelete,
  columnCount,
  hasPending,
  quantityError,
  children,
}) => {
  const [expandedComponentId, setExpandedComponentId] = useState<string | null>(null);
  const firstItem = items[0]?.item;
  const group = firstItem?.compositionGroup;
  if (!firstItem || !group) return null;

  const total = items.reduce((sum, entry) => sum + calcItemTotalValue(entry.item), 0);
  const groupIsExpanded = isExpanded;
  const handleToggleGroup = onToggleExpand;
  const toggleComponent = (itemId: string) => {
    setExpandedComponentId((current) => (current === itemId ? null : itemId));
  };
  const componentRows = groupIsExpanded
    ? children(expandedComponentId, toggleComponent)
    : null;

  const heading = (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="flex h-6 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        #{lineNumber}
      </span>
      <button
        type="button"
        onClick={handleToggleGroup}
        aria-expanded={groupIsExpanded}
        aria-label={`${groupIsExpanded ? 'Recolher' : 'Expandir'} produto composto ${group.description}`}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <i className={`bi bi-chevron-${groupIsExpanded ? 'down' : 'right'} text-xs text-slate-400`} />
        <i className="bi bi-boxes shrink-0 text-sm text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {group.description}
            </span>
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              Produto composto
            </span>
            {hasPending && (
              <span aria-label="Pendências neste produto composto" className="text-[10px] font-bold text-red-600 dark:text-red-400">
                <i className="bi bi-exclamation-circle-fill mr-1" />Pendências
              </span>
            )}
          </span>
          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {items.length} {items.length === 1 ? 'componente' : 'componentes'} vinculados
          </span>
        </span>
      </button>
    </div>
  );

  const quantityControl = (
    <div className="w-24 shrink-0" onClick={(event) => event.stopPropagation()}>
      <label className="mb-0.5 block text-[9px] font-black uppercase tracking-wider text-slate-400">
        Quantidade do produto composto
      </label>
      <UnitInput
        value={group.orderedQuantity}
        onChange={onQuantityChange}
      />
      {quantityError && <span role="alert" className="mt-1 block text-[9px] text-red-600 dark:text-red-400">{quantityError}</span>}
    </div>
  );

  const totalDisplay = (
    <div className="shrink-0 text-right">
      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
        Total do produto composto
      </span>
      <span className="text-sm font-black text-blue-600 dark:text-blue-400">
        <CurrencyDisplay value={total} />
      </span>
    </div>
  );

  const removeButton = (
    <button
      type="button"
      onClick={onDelete}
      aria-label={`Remover produto composto ${group.description}`}
      title="Remover produto composto"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
    >
      <i className="bi bi-trash3 text-xs" />
    </button>
  );

  const componentsHeading = (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        Composição do produto composto
      </span>
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        {items.length} {items.length === 1 ? 'item' : 'itens'}
      </span>
    </div>
  );

  if (isMobile) {
    return (
      <div
        className={`border-b transition-colors last:border-b-0 ${
          groupIsExpanded
            ? hasPending
              ? 'border-b-2 border-b-red-300 bg-red-50/30 dark:border-b-red-900 dark:bg-red-950/10'
              : 'border-b-2 border-b-blue-200 bg-blue-50/50 dark:border-b-blue-900/60 dark:bg-blue-950/20'
            : hasPending
              ? 'border-b-red-300 bg-white dark:border-b-red-900 dark:bg-slate-900'
              : 'border-b-slate-200/80 bg-white dark:border-b-slate-800 dark:bg-slate-900'
        }`}
      >
        <div className="relative flex flex-wrap items-center justify-between gap-3 p-3.5">
          {groupIsExpanded && (
            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-500" />
          )}
          {heading}
          <div className="flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-2 dark:border-slate-800 sm:w-auto sm:border-t-0 sm:pt-0">
            {quantityControl}
            {totalDisplay}
            {removeButton}
          </div>
        </div>
        {groupIsExpanded && (
          <div className="border-t border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/30">
            {componentsHeading}
            <div className="flex flex-col">{componentRows}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <tr
        className={
          groupIsExpanded
            ? 'border-b-2 border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20'
            : 'border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
        }
      >
        <td colSpan={columnCount} className="relative px-3 py-2.5">
          {groupIsExpanded && (
            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-500" />
          )}
          <div className="flex items-center justify-between gap-4">
            {heading}
            <div className="flex items-center gap-3">
              {quantityControl}
              {totalDisplay}
              {removeButton}
            </div>
          </div>
        </td>
      </tr>
      {groupIsExpanded && (
        <tr>
          <td colSpan={columnCount} className="bg-slate-50/70 p-2 dark:bg-slate-950/30">
            <div className="overflow-hidden border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/30">
              {componentsHeading}
              <table className="w-full border-collapse table-fixed">
                <tbody>{componentRows}</tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default CompositionGroupRow;
