import React from "react";
import BodyRow from "./BodyRow";
import { Item } from "../../../types/items.type";
import Product, { Variation } from "../../../types/product.type";
import { sanitizeItem } from "../../../utils/sanitization";
import { ValidationErrors } from "../../../utils/validations";

interface Props {
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    deliveryMethod: 'delivery' | 'pickup';
    errors: ValidationErrors;
    isMobile?: boolean;
}

const Body = ({ items, setItems, deliveryMethod, errors, isMobile }: Props) => {
    const toggleDiscountType = (idx: number) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            const newItem = { ...newItems[idx] };

            if (newItem.discountType === "fixed") {
                newItem.unitDiscount = newItem.unitDiscount / newItem.unitPrice * 100;
                newItem.discountType = "percentage"
            } else {
                newItem.unitDiscount = newItem.unitPrice * newItem.unitDiscount / 100;
                newItem.discountType = "fixed"
            }

            newItems[idx] = newItem;
            return newItems;
        });
    }

    const onSelectProduct = (idx: number, product: Product, variation?: Variation) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];

            let finalDescription = product.description;
            if (variation) {
                finalDescription += ` (${variation.name})`;
            }

            // Update current row
            newItems[idx] = sanitizeItem({
                ...newItems[idx],
                productId: product.id,
                variationId: variation?.id,
                description: finalDescription,
                unitPrice: (variation ? variation.unitPrice : product.unitPrice) || 0,
                condition: product.condition || '',
                isCombo: product.isCombo,
                currentStock: variation ? variation.stock : product.stock,
                minStock: variation ? variation.minStock : product.minStock,
            });

            // If it's a combo, add linked items
            if (product.isCombo && product.comboItems && product.comboItems.length > 0) {
                const linkedItems = product.comboItems.map((ci: any) => sanitizeItem({
                    description: ci.description,
                    quantity: ci.quantity * (newItems[idx].quantity || 1),
                    unitPrice: 0, // Combo has its own price
                    unitDiscount: 0,
                    discountType: 'fixed',
                    productId: ci.productId,
                    variationId: ci.variationId,
                    isComboItem: true, // Tag for UI
                    handlingType: newItems[idx].handlingType
                }));

                // Insert after the combo item
                newItems.splice(idx + 1, 0, ...linkedItems);
            }

            return newItems;
        });
    };

    const changeItems = (
        idx: number, key: keyof Item, value: string | number
    ) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            const newItem = sanitizeItem({ ...newItems[idx], [key]: value });
            newItems[idx] = newItem;

            // If quantity of a combo changes, update its linked items
            if (key === 'quantity' && newItem.isCombo) {
                let nextIdx = idx + 1;
                let comboStockMultiplier = typeof value === 'string' ? parseFloat(value) : value;
                if (isNaN(comboStockMultiplier)) comboStockMultiplier = 1;

                while (nextIdx < newItems.length && newItems[nextIdx].isComboItem) {
                    nextIdx++;
                }
            }
            return newItems;
        });
    };

    const deleteItem = (idx: number) => {
        setItems((prev: Item[]) => {
            const newItems = [...prev];
            const isCombo = newItems[idx].isCombo;
            let countToRemove = 1;

            if (isCombo) {
                let nextIdx = idx + 1;
                while (nextIdx < newItems.length && newItems[nextIdx].isComboItem) {
                    countToRemove++;
                    nextIdx++;
                }
            }

            newItems.splice(idx, countToRemove);
            return newItems;
        });
    };

    const content = items.map((item, idx) => (
        <BodyRow
            key={`${idx}-${item.productId || 'empty'}`}
            item={item}
            idx={idx}
            onChange={changeItems}
            onSelectProduct={onSelectProduct}
            onToggleDiscountType={() => toggleDiscountType(idx)}
            onDelete={() => deleteItem(idx)}
            deliveryMethod={deliveryMethod}
            errors={errors}
            isMobile={isMobile}
        />
    ));

    if (isMobile) {
        return <div className="space-y-4">{content}</div>;
    }

    return <tbody>{content}</tbody>;
};

export default Body;
