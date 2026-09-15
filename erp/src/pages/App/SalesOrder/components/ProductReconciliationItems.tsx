import React from "react";
import ProductAutocomplete from "../../../components/ProductAutocomplete";
import Item from "../../types/items.type";
import Product, { Variation } from "../../types/product.type";

type Props = {
    items: Item[];
    temporaryIndexes: number[];
    isSaving?: boolean;
    onSelectProduct: (index: number, product: Product, variation?: Variation) => void;
    onSave: () => void;
};

const ProductReconciliationItems = ({ items, temporaryIndexes, isSaving, onSelectProduct, onSave }: Props) => {
    const missingProduct = temporaryIndexes.some(index => !items[index]?.productId?.trim());

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="text-sm font-black">Conciliação comercial de produtos sem cadastro</p>
                <p className="mt-1 text-xs font-medium leading-relaxed">Selecione o produto cadastrado correspondente para cada item. A conciliação comercial serve exclusivamente para indexar o produto cadastrado no lugar do item sem cadastro para relatórios e análises de vendas. <strong>Esta ação não gera nenhuma movimentação de estoque (nem saída na venda, nem entrada em devoluções).</strong></p>
            </div>

            {temporaryIndexes.map((index, position) => {
                const item = items[index];
                if (!item) return null;
                const isLinked = Boolean(item.productId?.trim());

                return (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto sem cadastro {position + 1}</span>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.description || "Item sem descrição"}</p>
                            </div>
                            <span className={`rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider ${isLinked ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"}`}>{isLinked ? "Conciliado" : "Obrigatório"}</span>
                        </div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Produto cadastrado <span className="text-red-500">*</span></label>
                        <ProductAutocomplete
                            value={item.description}
                            onChange={() => undefined}
                            onSelect={(product, variation) => onSelectProduct(index, product, variation)}
                            placeholder="Buscar produto cadastrado..."
                            isTemporary={!isLinked}
                            isSelected={isLinked}
                        />
                    </div>
                );
            })}

            <div className="flex justify-end">
                <button type="button" disabled={missingProduct || isSaving} onClick={onSave} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {isSaving ? "Salvando..." : "Salvar conciliação comercial"}
                </button>
            </div>
        </div>
    );
};

export default ProductReconciliationItems;
