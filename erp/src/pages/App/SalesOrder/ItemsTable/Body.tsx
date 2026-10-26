import React from 'react';
import BodyRow from './BodyRow';
import { Item } from '../../../types/items.type';
import { sanitizeItem } from '../../../utils/sanitization';
import { ValidationErrors } from '../../../utils/validations';
import CompositionGroupRow, { IndexedCompositionItem } from './CompositionGroupRow';
import CompositionAutocomplete from './CompositionAutocomplete';
import Product, { Variation } from '../../../types/product.type';

interface Props {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  deliveryMethod: 'delivery' | 'pickup';
  errors: ValidationErrors;
  isMobile?: boolean;
  onSelectProduct: (idx: number, product: any, variation?: any) => void;
  isBudget?: boolean;
  isReturn?: boolean;
  hideHandling?: boolean;
  highlightTemporaryItems?: boolean;
  expandedIndex?: number | null;
  setExpandedIndex?: (idx: number | null) => void;
  autoFocusDescriptionIndex?: number | null;
  onDescriptionBlur?: (idx: number) => void;
  compositionDraftOpen?: boolean;
  onSelectComposition?: (product: Product, variation?: Variation) => void;
  onCancelCompositionDraft?: () => void;
}

const Body = ({
  items,
  setItems,
  deliveryMethod,
  errors,
  isMobile,
  onSelectProduct,
  isBudget,
  isReturn,
  hideHandling,
  highlightTemporaryItems,
  expandedIndex,
  setExpandedIndex,
  autoFocusDescriptionIndex,
  onDescriptionBlur,
  compositionDraftOpen,
  onSelectComposition,
  onCancelCompositionDraft,
}: Props) => {
  const toggleDiscountType = (idx: number) => {
    setItems((prev: Item[]) => {
      const newItems = [...prev];
      const newItem = { ...newItems[idx] };

      if (newItem.discountType === 'fixed') {
        newItem.unitDiscount = (newItem.unitDiscount / (newItem.unitPrice || 1)) * 100;
        newItem.discountType = 'percentage';
      } else {
        newItem.unitDiscount = ((newItem.unitPrice || 1) * newItem.unitDiscount) / 100;
        newItem.discountType = 'fixed';
      }

      newItems[idx] = newItem;
      return newItems;
    });
  };

  const changeItems = (idx: number, key: keyof Item, value: string | number) => {
    setItems((prev: Item[]) => {
      const newItems = [...prev];
      const currentItem = newItems[idx];
      if (
        currentItem?.compositionGroup &&
        (key === 'description' || key === 'quantity' || key === 'productId' || key === 'variationId')
      ) {
        return prev;
      }

      let extraUpdates: Partial<Item> = {};
      if (key === 'description' && currentItem?.itemType !== 'service') {
        const text = String(value).trim();
        const isDifferent = text !== (currentItem?.description || '').trim();
        if (isDifferent) {
          extraUpdates = {
            productId: undefined,
            variationId: undefined,
            isTemporaryProduct: Boolean(text),
          };
        }
      }

      const newItem = sanitizeItem({
        ...currentItem,
        [key]: value,
        ...extraUpdates,
      });
      newItems[idx] = newItem;
      return newItems;
    });
  };

  const changeBatchItems = (idx: number, changes: Partial<Item>) => {
    setItems((prev: Item[]) => {
      const newItems = [...prev];
      const newItem = sanitizeItem({ ...newItems[idx], ...changes });
      newItems[idx] = newItem;
      return newItems;
    });
  };

  const deleteItem = (idx: number) => {
    setItems((prev: Item[]) => {
      const removedItem = prev[idx];
      if (!removedItem) return prev;
      const removedCompositionId = removedItem.compositionGroup?.groupId;
      const removedOrderItemIds = new Set(
        prev
          .filter((item, index) =>
            removedCompositionId
              ? item.compositionGroup?.groupId === removedCompositionId
              : index === idx
          )
          .map((item) => item.orderItemId)
          .filter((id): id is string => Boolean(id))
      );
      const newItems = prev.filter((item, index) =>
        removedCompositionId
          ? item.compositionGroup?.groupId !== removedCompositionId
          : index !== idx
      );
      if (removedItem.itemType !== 'service' && removedOrderItemIds.size > 0) {
        return newItems.map((item) => {
          if (item.itemType !== 'service') return item;
          const linkedIds = item.linkedProductOrderItemIds;
          const updatedIds = linkedIds?.filter((id) => !removedOrderItemIds.has(id));
          const removedLegacyLink = Boolean(
            item.linkedProductOrderItemId && removedOrderItemIds.has(item.linkedProductOrderItemId)
          );
          if (!removedLegacyLink && (!linkedIds || updatedIds?.length === linkedIds.length)) return item;
          return {
            ...item,
            linkedProductOrderItemIds: updatedIds,
            linkedProductOrderItemId: removedLegacyLink ? undefined : item.linkedProductOrderItemId,
          };
        });
      }
      return newItems;
    });
    if (expandedIndex === idx) {
      setExpandedIndex?.(null);
    }
  };

  const changeCompositionQuantity = (groupId: string, rawQuantity: number) => {
    const orderedQuantity = Math.max(1, Math.floor(Number(rawQuantity) || 1));
    setItems((prev: Item[]) =>
      prev.map((item) => {
        const group = item.compositionGroup;
        if (!group || group.groupId !== groupId) return item;
        return {
          ...item,
          quantity: group.quantityPerComposition * orderedQuantity,
          compositionGroup: { ...group, orderedQuantity },
        };
      })
    );
  };

  // Preserva a ordem original entre produtos simples, compostos e serviços.
  const indexedItems = items.map((item, originalIndex) => ({ item, originalIndex }));
  if (indexedItems.length === 0 && !compositionDraftOpen) {
    return (
      <div className="bg-slate-50/50 px-4 py-8 text-center dark:bg-slate-850/40">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2 text-base">
          <i className="bi bi-inboxes" />
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Nenhum item adicionado neste pedido.
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Use “Adicionar item” para incluir um produto, produto composto ou serviço.
        </p>
      </div>
    );
  }

  const displayRows: Array<
    | { type: 'item'; entry: { item: Item; originalIndex: number }; lineNumber: number }
    | {
        type: 'composition';
        groupId: string;
        items: IndexedCompositionItem[];
        firstIndex: number;
        lineNumber: number;
      }
  > = [];
  const seenCompositionGroups = new Set<string>();
  indexedItems.forEach((entry) => {
    const groupId = entry.item.compositionGroup?.groupId;
    if (!groupId) {
      displayRows.push({ type: 'item', entry, lineNumber: displayRows.length + 1 });
      return;
    }
    if (seenCompositionGroups.has(groupId)) return;
    seenCompositionGroups.add(groupId);
    const compositionItems = indexedItems.filter(
      (candidate) => candidate.item.compositionGroup?.groupId === groupId
    );
    displayRows.push({
      type: 'composition',
      groupId,
      items: compositionItems,
      firstIndex: compositionItems[0].originalIndex,
      lineNumber: displayRows.length + 1,
    });
  });

  const hasItemErrors = (index: number) =>
    Object.keys(errors).some((key) => key.startsWith(`item_${index}_`));

  const content = displayRows.map((row) => {
    if (row.type === 'composition') {
      return (
        <CompositionGroupRow
          key={row.groupId}
          items={row.items}
          lineNumber={row.lineNumber}
          isMobile={Boolean(isMobile)}
          isExpanded={expandedIndex === row.firstIndex}
          onToggleExpand={() =>
            setExpandedIndex?.(expandedIndex === row.firstIndex ? null : row.firstIndex)
          }
          onQuantityChange={(quantity) => changeCompositionQuantity(row.groupId, quantity)}
          onDelete={() => deleteItem(row.firstIndex)}
          columnCount={hideHandling ? 8 : 9}
          hasPending={row.items.some(({ originalIndex }) => hasItemErrors(originalIndex))}
          quantityError={row.items
            .map(({ originalIndex }) => errors[`item_${originalIndex}_quantity`])
            .find(Boolean)}
        >
          {(expandedComponentId, toggleComponent) =>
            row.items.map(({ item, originalIndex }) => {
              const componentId = item.orderItemId || `${row.groupId}-${item.compositionGroup!.componentIndex}`;
              return (
                <BodyRow
                  key={componentId}
                  item={item}
                  productItems={items.filter((candidate) => candidate.itemType !== 'service')}
                  idx={originalIndex}
                  displayNumber={`${row.lineNumber}.${item.compositionGroup!.componentIndex + 1}`}
                  onChange={changeItems}
                  onBatchChange={changeBatchItems}
                  onToggleDiscountType={() => toggleDiscountType(originalIndex)}
                  onDelete={() => deleteItem(originalIndex)}
                  deliveryMethod={deliveryMethod}
                  errors={errors}
                  isMobile={isMobile}
                  onSelectProduct={onSelectProduct}
                  isBudget={isBudget}
                  isReturn={isReturn}
                  hideHandling={hideHandling}
                  isExpanded={expandedComponentId === componentId}
                  onToggleExpand={() => toggleComponent(componentId)}
                  isCompositionComponent
                />
              );
            })
          }
        </CompositionGroupRow>
      );
    }

    const { item, originalIndex } = row.entry;
    return (
      <BodyRow
        key={item.orderItemId || `${originalIndex}-${item.productId || item.itemType || 'empty'}`}
        item={item}
        productItems={items.filter((candidate) => candidate.itemType !== 'service')}
        idx={originalIndex}
        displayNumber={String(row.lineNumber)}
        onChange={changeItems}
        onBatchChange={changeBatchItems}
        onToggleDiscountType={() => toggleDiscountType(originalIndex)}
        onDelete={() => deleteItem(originalIndex)}
        deliveryMethod={deliveryMethod}
        errors={errors}
        isMobile={isMobile}
        onSelectProduct={onSelectProduct}
        isBudget={isBudget}
        isReturn={isReturn}
        hideHandling={hideHandling}
        highlightAsTemporary={
          highlightTemporaryItems &&
          (!item.productId || item.productId.trim() === '') &&
          item.itemType !== 'service'
        }
        isExpanded={expandedIndex === originalIndex}
        autoFocusDescription={autoFocusDescriptionIndex === originalIndex}
        onAutoExpand={() => setExpandedIndex?.(originalIndex)}
        onDescriptionBlur={() => onDescriptionBlur?.(originalIndex)}
        onToggleExpand={() =>
          setExpandedIndex?.(expandedIndex === originalIndex ? null : originalIndex)
        }
      />
    );
  });

  const compositionDraft = compositionDraftOpen ? (
    isMobile ? (
      <div className="flex items-center gap-2.5 border-b border-slate-200/80 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <i className="bi bi-boxes text-sm" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="mb-1 ml-1 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Produto composto existente
          </span>
          <CompositionAutocomplete
            autoFocus
            onSelect={(product, variation) => onSelectComposition?.(product, variation)}
          />
        </div>
        <button
          type="button"
          aria-label="Cancelar busca de produto composto"
          title="Cancelar busca"
          onClick={onCancelCompositionDraft}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <i className="bi bi-x-lg text-xs" aria-hidden="true" />
        </button>
      </div>
    ) : (
      <tr>
        <td colSpan={hideHandling ? 8 : 9} className="border-b border-slate-200/80 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <i className="bi bi-boxes text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Produto composto existente
            </span>
            <CompositionAutocomplete
              autoFocus
              onSelect={(product, variation) => onSelectComposition?.(product, variation)}
            />
            <button
              type="button"
              aria-label="Cancelar busca de produto composto"
              title="Cancelar busca"
              onClick={onCancelCompositionDraft}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <i className="bi bi-x-lg text-xs" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    )
  ) : null;

  if (isMobile) {
    return <>{content}{compositionDraft}</>;
  }

  return <tbody>{content}{compositionDraft}</tbody>;
};

export default Body;
