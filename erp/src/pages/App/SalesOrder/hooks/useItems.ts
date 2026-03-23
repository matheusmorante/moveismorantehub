import { useState } from "react";
import Item from "../../../types/items.type";

const useItems = () => {
    const [items, setItems] = useState<Item[]>([
        {
            description: '',
            quantity: 1,
            unitPrice: 0,
            unitDiscount: 0,
            discountType: 'fixed',
            handlingType: ''
        }
    ])


    return { items, setItems }
}

export default useItems;