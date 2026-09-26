import React from "react";
import BodyRow from "./BodyRow";
import { Item } from "../../../types/items.type";
import { sanitizeItem } from "../../../utils/sanitization";
import { ValidationErrors } from "../../../utils/validations";

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
    activeTab?: 'products' | 'services';
    expandedIndex?: number | null;
    setExpandedIndex?: (idx: number | null) => void;
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
    activeTab,
    expandedIndex,
    setExpandedIndex
}: Props) => {
    const toggleDiscountType = (idx: number) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            const newItem = { ...newItems[idx] };

            if (newItem.discountType === "fixed") {
                newItem.unitDiscount = newItem.unitDiscount / (newItem.unitPrice || 1) * 100;
                newItem.discountType = "percentage";
            } else {
                newItem.unitDiscount = (newItem.unitPrice || 1) * newItem.unitDiscount / 100;
                newItem.discountType = "fixed";
            }

            newItems[idx] = newItem;
            return newItems;
        });
    };

    const changeItems = (
        idx: number, key: keyof Item, value: string | number
    ) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            const currentItem = newItems[idx];
            
            let extraUpdates: Partial<Item> = {};
            if (key === 'description' && currentItem?.itemType !== 'service') {
                const text = String(value).trim();
                const isDifferent = text !== (currentItem?.description || '').trim();
                if (isDifferent) {
                    extraUpdates = {
                        productId: undefined,
                        variationId: undefined,
                        isTemporaryProduct: Boolean(text)
                    };
                }
            }

            const newItem = sanitizeItem({
                ...currentItem,
                [key]: value,
                ...extraUpdates
            });
            newItems[idx] = newItem;
            return newItems;
        });
    };

    const changeBatchItems = (
        idx: number, changes: Partial<Item>
    ) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            const newItem = sanitizeItem({ ...newItems[idx], ...changes });
            newItems[idx] = newItem;
            return newItems;
        });
    };

    const deleteItem = (idx: number) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            newItems.splice(idx, 1);
            return newItems;
        });
        if (expandedIndex === idx) {
            setExpandedIndex?.(null);
        }
    };

    // Mapeia os itens preservando seu índice original no array global
    const indexedItems = items.map((item, originalIndex) => ({ item, originalIndex }));

    // Filtra conforme a aba ativa
    const filteredIndexedItems = activeTab
        ? indexedItems.filter(({ item }) =>
            activeTab === 'services' ? item.itemType === 'service' : item.itemType !== 'service'
        )
        : indexedItems;

    if (filteredIndexedItems.length === 0) {
        const isServicesTab = activeTab === 'services';
        return (
            <div className="py-8 px-4 text-center bg-slate-50/50 dark:bg-slate-850/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2 text-base">
                    <i className={`bi ${isServicesTab ? 'bi-tools' : 'bi-box-seam'}`} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Nenhum {isServicesTab ? 'serviço' : 'produto'} adicionado neste pedido.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                    Utilize o botão acima para adicionar {isServicesTab ? 'um novo serviço' : 'um produto'}.
                </p>
            </div>
        );
    }

    const content = filteredIndexedItems.map(({ item, originalIndex }) => (
        <BodyRow
            key={`${originalIndex}-${item.productId || item.itemType || 'empty'}`}
            item={item}
            idx={originalIndex}
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
            highlightAsTemporary={highlightTemporaryItems && (!item.productId || item.productId.trim() === '') && item.itemType !== 'service'}
            isExpanded={expandedIndex === originalIndex}
            onToggleExpand={() => setExpandedIndex?.(expandedIndex === originalIndex ? null : originalIndex)}
        />
    ));

    if (isMobile) {
        return <>{content}</>;
    }

    return <tbody>{content}</tbody>;
};

export default Body;
