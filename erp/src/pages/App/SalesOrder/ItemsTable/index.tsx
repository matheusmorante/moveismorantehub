import React, { useState } from 'react';
import Footer from './Footer';
import Body from './Body';
import { Item, ItemsSummary } from '../../../types/items.type';
import { ValidationErrors } from '../../../utils/validations';
import { useWindowSize } from '../../../../hooks/useWindowSize';
import { ItemsTableTabsBar } from './ItemsTableTabsBar';
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
  activeTab?: 'products' | 'services';
  onTabChange?: (tab: 'products' | 'services') => void;
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
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange,
}: Props) => {
  const hideHandling = Boolean(propHideHandling || isBudget || isReturn);

  // Estado da aba interna (Produtos vs Serviços)
  const [internalTab, setInternalTab] = useState<'products' | 'services'>('products');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalTab;
  const setActiveTab = (tab: 'products' | 'services') => {
    if (externalOnTabChange) externalOnTabChange(tab);
    setInternalTab(tab);
  };

  // Apenas um item expandido por vez no modo card
  const [expandedIndex, setExpandedIndex] = useState<number | null>(() => {
    // Se houver apenas 1 item e ele estiver vazio, abre expandido
    if (items.length === 1 && !items[0].description) return 0;
    return null;
  });

  const productsCount = items.filter((i) => i.itemType !== 'service').length;
  const servicesCount = items.filter((i) => i.itemType === 'service').length;

  const handleAddItem = (itemType: 'product' | 'service') => {
    const newItemIndex = items.length;
    setItems((prev: Item[]) => [...prev, createEmptyOrderItem(itemType)]);
    setActiveTab(itemType === 'service' ? 'services' : 'products');
    setExpandedIndex(newItemIndex);
  };

  const handleAddCurrent = () => {
    handleAddItem(activeTab === 'services' ? 'service' : 'product');
  };

  const { width } = useWindowSize();
  const isCardsView = width < 1280; // Visualização em cards para telas menores que XL (< 1280px)

  return (
    <div className="flex flex-col gap-3 p-0 h-full w-full">
      {!isReturn && (
        <ItemsTableTabsBar
          activeTab={activeTab}
          productsCount={productsCount}
          servicesCount={servicesCount}
          onSelectTab={setActiveTab}
          onAddCurrent={handleAddCurrent}
        />
      )}

      {/* Conteúdo: Modo Cards (telas < 1280px) ou Modo Tabela (telas >= 1280px) */}
      {isCardsView ? (
        <div className="flex flex-col gap-2.5">
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
            activeTab={activeTab}
            expandedIndex={expandedIndex}
            setExpandedIndex={setExpandedIndex}
          />

          <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <Footer summary={summary} items={items} isMobile={true} isBudget={isBudget} />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <table className="w-full border-collapse table-fixed">
            <ItemsTableDesktopHeader activeTab={activeTab} hideHandling={hideHandling} />
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
              activeTab={activeTab}
            />
            <Footer summary={summary} items={items} isBudget={isBudget} />
          </table>
        </div>
      )}
    </div>
  );
};

export default ItemsTable;
