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
}

const Body = ({ items, setItems, deliveryMethod, errors, isMobile }: Props) => {
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
            const newItem = sanitizeItem({ ...newItems[idx], [key]: value });
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
