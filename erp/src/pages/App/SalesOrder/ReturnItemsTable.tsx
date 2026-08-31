import React from "react";
import SectionCard from "../../../components/SectionCard";
import Item from "../../types/items.type";
import { calcItemsSummary } from "../../utils/calculations";
import ItemsTable from "./ItemsTable";

type Props = { items: Item[]; setItems: React.Dispatch<React.SetStateAction<Item[]>>; deliveryMethod: "delivery" | "pickup" };

const emptyItem = (): Item => ({ description: "", quantity: 1, unitPrice: 0, unitDiscount: 0, discountType: "fixed", handlingType: "" });

const ReturnItemsTable = ({ items, setItems, deliveryMethod }: Props) => {
    const selectProduct = (index: number, product: any, variation?: any) => {
        const productName = (product.name || product.title || product.description || "").trim();
        const normalizedProduct = productName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const normalizedVariation = variation?.name?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const description = variation && !normalizedVariation?.includes(normalizedProduct) ? `${productName} - ${variation.name}` : (variation?.name || productName);
        const unitPrice = variation?.promoPrice || variation?.unitPrice || product.promoPrice || product.unitPrice || 0;
        const costPrice = variation?.costPrice ?? product.costPrice ?? 0;
        setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: product.id, variationId: variation?.id, isTemporaryProduct: false, code: variation?.sku || product.code || product.sku || "", description, unitPrice: Number(unitPrice) || 0, costPrice: Number(costPrice) || 0, handlingType: product.itemType === "service" ? "Execução no local" : item.handlingType, condition: variation?.condition || product.condition || "novo" } : item));
    };

    return <SectionCard icon="bi bi-box-seam" iconBg="bg-amber-600 shadow-amber-100 dark:shadow-amber-900/20" title="Itens da devolução" subtitle="Informe os produtos e valores devolvidos" action={<button type="button" onClick={() => setItems(current => [...current, emptyItem()])} className="flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-700"><i className="bi bi-plus-lg text-xs" />Adicionar item</button>}>
        <ItemsTable items={items} setItems={setItems} summary={calcItemsSummary(items)} deliveryMethod={deliveryMethod} errors={{}} onSelectProduct={selectProduct} />
    </SectionCard>;
};

export default ReturnItemsTable;
