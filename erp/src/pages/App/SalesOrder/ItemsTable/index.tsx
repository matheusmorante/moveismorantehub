import React, { useRef, useState } from 'react';
import Footer from './Footer';
import Body from './Body';
import { Item, ItemsSummary } from '../../../types/items.type';
import { ValidationErrors } from '../../../utils/validations';
import { useWindowSize } from '../../../../hooks/useWindowSize';
import { ItemsTableHeader } from './ItemsTableHeader';
import { ItemsTableDesktopHeader } from './ItemsTableDesktopHeader';

interface Props {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  summary: ItemsSummary;
  deliveryMethod: 'delivery' | 'pickup';
  errors: ValidationErrors;
  onSelectProduct: (idx: number, product: any, variation?: any) => void;
  isBudget?: boolean;
  isReturn?: boolean;
  hideHandling?: boolean;
  /** Se true, destaca visualmente os itens sem produto real vinculado */
  highlightTemporaryItems?: boolean;
}

function createEmptyOrderItem(itemType: 'product' | 'service'): Item {
  return {
    description: '',
    quantity: 1,
    unitPrice: 0,
    unitDiscount: 0,
    discountType: 'fixed',
    handlingType: '',
    itemType,
    orderItemId: crypto.randomUUID(),
  };
}

const ItemsTable = ({
  items,
  setItems,
  summary,
  deliveryMethod,
  errors,
  onSelectProduct,
  isBudget,
  isReturn,
  hideHandling: propHideHandling,
  highlightTemporaryItems,
}: Props) => {
  const hideHandling = Boolean(propHideHandling || isBudget || isReturn);

  // Apenas um item expandido por vez no modo card
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [descriptionFocusIndex, setDescriptionFocusIndex] = useState<number | null>(null);
  const [compositionDraftOpen, setCompositionDraftOpen] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const compositionGroups = new Set(
    items.map((item) => item.compositionGroup?.groupId).filter((groupId): groupId is string => Boolean(groupId))
  );
  const productsCount =
    items.filter((item) => item.itemType !== 'service' && !item.compositionGroup).length +
    compositionGroups.size;
  const servicesCount = items.filter((i) => i.itemType === 'service').length;
  const physicalProductQuantity = items
    .filter((item) => item.itemType !== 'service')
    .reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  const handleAddItem = (itemType: 'product' | 'composition' | 'service') => {
    setExpandedIndex(null);
    setDescriptionFocusIndex(null);

    if (itemType === 'composition') {
      setCompositionDraftOpen(true);
      return;
    }

    setCompositionDraftOpen(false);
    const newItemIndex = items.length;
    setItems((prev: Item[]) => [...prev, createEmptyOrderItem(itemType)]);
    setDescriptionFocusIndex(newItemIndex);
  };

  const handleCompositionSelect = (product: any, variation?: any) => {
    const newItemIndex = itemsRef.current.length;
    onSelectProduct(newItemIndex, product, variation);
    setExpandedIndex(newItemIndex);
    setCompositionDraftOpen(false);
  };

  const { width } = useWindowSize();
  const isCardsView = width < 1280; // Visualização em cards para telas menores que XL (< 1280px)

  return (
    <div className="flex flex-col gap-3 p-0 h-full w-full">
      {!isReturn && (
        <ItemsTableHeader
          productsCount={productsCount}
          servicesCount={servicesCount}
          onAddItem={handleAddItem}
        />
      )}

      {/* Conteúdo: Modo Cards (telas < 1280px) ou Modo Tabela (telas >= 1280px) */}
      {isCardsView ? (
        <div className="flex flex-col">
          <div className="flex flex-col">
            <Body
              items={items}
              setItems={setItems}
              deliveryMethod={deliveryMethod}
              errors={errors}
              isMobile={true}
              onSelectProduct={onSelectProduct}
              isBudget={isBudget}
              isReturn={isReturn}
              hideHandling={hideHandling}
              highlightTemporaryItems={highlightTemporaryItems}
              expandedIndex={expandedIndex}
              setExpandedIndex={setExpandedIndex}
              autoFocusDescriptionIndex={descriptionFocusIndex}
              onDescriptionBlur={(idx) =>
                setDescriptionFocusIndex((current) => (current === idx ? null : current))
              }
              compositionDraftOpen={compositionDraftOpen}
              onSelectComposition={handleCompositionSelect}
              onCancelCompositionDraft={() => setCompositionDraftOpen(false)}
            />
          </div>

          <div className="border-t border-slate-200/70 bg-slate-50/50 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/20">
            <Footer summary={summary} items={items} isMobile={true} isBudget={isBudget} physicalProductQuantity={physicalProductQuantity} />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <table className="w-full border-collapse table-fixed">
            <ItemsTableDesktopHeader hideHandling={hideHandling} />
            <Body
              items={items}
              setItems={setItems}
              deliveryMethod={deliveryMethod}
              errors={errors}
              isMobile={false}
              onSelectProduct={onSelectProduct}
              isBudget={isBudget}
              isReturn={isReturn}
              hideHandling={hideHandling}
              highlightTemporaryItems={highlightTemporaryItems}
              autoFocusDescriptionIndex={descriptionFocusIndex}
              onDescriptionBlur={(idx) =>
                setDescriptionFocusIndex((current) => (current === idx ? null : current))
              }
              compositionDraftOpen={compositionDraftOpen}
              onSelectComposition={handleCompositionSelect}
              onCancelCompositionDraft={() => setCompositionDraftOpen(false)}
            />
            <Footer summary={summary} items={items} isBudget={isBudget} physicalProductQuantity={physicalProductQuantity} />
          </table>
        </div>
      )}
    </div>
  );
};

export default ItemsTable;
