import React from 'react';
import BodyRow from './BodyRow';
import { Item } from '../../../types/items.type';
import { sanitizeItem } from '../../../utils/sanitization';
import { ValidationErrors } from '../../../utils/sales/validations';
import CompositionGroupRow, { IndexedCompositionItem } from './CompositionGroupRow';

interface Props {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  deliveryMethod: 'delivery' | 'pickup';
  errors: ValidationErrors;
  isMobile?: boolean;
  isTablet?: boolean;
  isNarrowMobile?: boolean;
  compactDesktop?: boolean;
  alwaysExpanded?: boolean;
  onSelectProduct: (idx: number, product: any, variation?: any) => void;
  isBudget?: boolean;
  useItemEditorModal?: boolean;
  isReturn?: boolean;
  hideHandling?: boolean;
  highlightTemporaryItems?: boolean;
  expandedIndex?: number | null;
  setExpandedIndex?: (idx: number | null) => void;
  autoFocusDescriptionIndex?: number | null;
  onDescriptionBlur?: (idx: number) => void;
}

const Body = ({
  items,
  setItems,
  deliveryMethod,
  errors,
  isMobile,
  isTablet,
  isNarrowMobile,
  compactDesktop,
  alwaysExpanded = false,
  onSelectProduct,
  isBudget,
  useItemEditorModal,
  isReturn,
  hideHandling,
  highlightTemporaryItems,
  expandedIndex,
  setExpandedIndex,
  autoFocusDescriptionIndex,
  onDescriptionBlur,
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
    const removedItem = items[idx];
    if (!removedItem) return;
    const removedCompositionId = removedItem.compositionGroup?.groupId;
    const previouslyExpandedItem = expandedIndex == null ? null : items[expandedIndex];
    setItems((prev: Item[]) => {
      const currentRemovedItem = prev[idx];
      if (!currentRemovedItem) return prev;
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
      if (currentRemovedItem.itemType !== 'service' && removedOrderItemIds.size > 0) {
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
    const nextExpandedIndex = previouslyExpandedItem
      ? items
          .filter((item, index) => {
            if (removedCompositionId) return item.compositionGroup?.groupId !== removedCompositionId;
            return index !== idx;
          })
          .findIndex((item) =>
            previouslyExpandedItem.orderItemId
              ? item.orderItemId === previouslyExpandedItem.orderItemId
              : item === previouslyExpandedItem
          )
      : -1;
    setExpandedIndex?.(nextExpandedIndex >= 0 ? nextExpandedIndex : null);
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
  if (indexedItems.length === 0) {
    const emptyState = (
      <div className="bg-slate-50/50 px-4 py-8 text-center dark:bg-slate-850/40">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2 text-base">
          <i className="bi bi-inboxes" />
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Nenhum item adicionado neste pedido.
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Use “Adicionar item” para incluir um produto ou serviço.
        </p>
      </div>
    );
    if (isMobile) return emptyState;
    return (
      <tbody>
        <tr>
          <td colSpan={compactDesktop ? 8 : hideHandling ? 8 : 9}>{emptyState}</td>
        </tr>
      </tbody>
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
          columnCount={compactDesktop ? 8 : hideHandling ? 8 : 9}
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
                  idx={originalIndex}
                  displayNumber={`${row.lineNumber}.${item.compositionGroup!.componentIndex + 1}`}
                  onChange={changeItems}
                  onBatchChange={changeBatchItems}
                  onToggleDiscountType={() => toggleDiscountType(originalIndex)}
                  onDelete={() => deleteItem(originalIndex)}
                  deliveryMethod={deliveryMethod}
                  errors={errors}
                  isMobile={isMobile}
                  isTablet={isTablet}
                  isNarrowMobile={isNarrowMobile}
                  compactDesktop={compactDesktop}
                  onSelectProduct={onSelectProduct}
                  isBudget={isBudget}
                  useItemEditorModal={false}
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
        idx={originalIndex}
        displayNumber={String(row.lineNumber)}
        onChange={changeItems}
        onBatchChange={changeBatchItems}
        onToggleDiscountType={() => toggleDiscountType(originalIndex)}
        onDelete={() => deleteItem(originalIndex)}
        deliveryMethod={deliveryMethod}
        errors={errors}
        isMobile={isMobile}
        isTablet={isTablet}
        isNarrowMobile={isNarrowMobile}
        compactDesktop={compactDesktop}
        onSelectProduct={onSelectProduct}
        isBudget={isBudget}
        useItemEditorModal={useItemEditorModal}
        isReturn={isReturn}
        hideHandling={hideHandling}
        highlightAsTemporary={
          highlightTemporaryItems &&
          (!item.productId || item.productId.trim() === '') &&
          item.itemType !== 'service'
        }
        isExpanded={alwaysExpanded || expandedIndex === originalIndex}
        autoFocusDescription={autoFocusDescriptionIndex === originalIndex}
        onAutoExpand={() => setExpandedIndex?.(originalIndex)}
        onDescriptionBlur={() => onDescriptionBlur?.(originalIndex)}
        onToggleExpand={alwaysExpanded ? undefined : () =>
          setExpandedIndex?.(expandedIndex === originalIndex ? null : originalIndex)
        }
      />
    );
  });

  if (isMobile) {
    return <>{content}</>;
  }

  return <tbody>{content}</tbody>;
};

export default Body;
