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
    highlightTemporaryItems?: boolean;
}

const Body = ({ items, setItems, deliveryMethod, errors, isMobile, onSelectProduct, isBudget, highlightTemporaryItems }: Props) => {
    const toggleDiscountType = (idx: number) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            const newItem = { ...newItems[idx] };

            if (newItem.discountType === "fixed") {
                newItem.unitDiscount = newItem.unitDiscount / (newItem.unitPrice || 1) * 100;
                newItem.discountType = "percentage"
            } else {
                newItem.unitDiscount = (newItem.unitPrice || 1) * newItem.unitDiscount / 100;
                newItem.discountType = "fixed"
            }

            newItems[idx] = newItem;
            return newItems;
        });
    }

    const changeItems = (
        idx: number, key: keyof Item, value: string | number
    ) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            const currentItem = newItems[idx];
            
            let extraUpdates: Partial<Item> = {};
            if (key === 'description') {
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
    };

    const content = items.map((item, idx) => (
        <BodyRow
            key={`${idx}-${item.productId || 'empty'}`}
            item={item}
            idx={idx}
            onChange={changeItems}
            onBatchChange={changeBatchItems}
            onToggleDiscountType={() => toggleDiscountType(idx)}
            onDelete={() => deleteItem(idx)}
            deliveryMethod={deliveryMethod}
            errors={errors}
            isMobile={isMobile}
            onSelectProduct={onSelectProduct}
            isBudget={isBudget}
            highlightAsTemporary={highlightTemporaryItems && (!item.productId || item.productId.trim() === '')}
        />
    ));

    if (isMobile) {
        return <>{content}</>;
    }

    return <tbody>{content}</tbody>;
};

export default Body;
