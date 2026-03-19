import React from "react";
import Footer from "./Footer";
import Body from "./Body";
import { Item, ItemsSummary } from "../../../types/items.type";
import { ValidationErrors } from "../../../utils/validations";
import { useWindowSize } from "../../../../hooks/useWindowSize";

interface Props {
    items: Item[],
    setItems: React.Dispatch<React.SetStateAction<Item[]>>
    summary: ItemsSummary,
    deliveryMethod: 'delivery' | 'pickup',
    errors: ValidationErrors
}

const ItemsTable = ({ items, setItems, summary, deliveryMethod, errors }: Props) => {
    const addItem = () => {
        setItems((prev: Item[]) => {
            return ([
                ...prev,
                {
                    description: '',
                    quantity: 1,
                    unitPrice: 0,
                    unitDiscount: 0,
                    discountType: 'fixed',
                    handlingType: deliveryMethod === 'delivery' ? 'Montagem no Local' : 'Para Montar (Desmontado)'
                }
            ])
        })
    }

    const { width } = useWindowSize();
    const isMobile = width <= 1500;

    if (isMobile) {
        return (
            <div className="flex flex-col gap-4 p-4 h-full">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Itens</h3>
                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-blue-900/20 active:scale-95 transition-all"
                    >
                        <i className="bi bi-plus-lg" /> Adicionar Item
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar pr-1">
                    <Body items={items} setItems={setItems} deliveryMethod={deliveryMethod} errors={errors} isMobile={true} />
                </div>

                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <Footer summary={summary} isMobile={true} />
                </div>
            </div>
        );
    }

    return (
        <table className="w-full border-collapse">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 min-w-[200px]">Descrição <span className="text-red-500">*</span></th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[130px]">Manuseio</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[80px]">Qtd. <span className="text-red-500">*</span></th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]">Preço Un. <span className="text-red-500">*</span></th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[120px]">Desconto</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]">Total</th>
                    <th className="px-4 py-3 text-center border-none bg-transparent w-[60px]">
                        <button
                            type="button"
                            onClick={addItem}
                            className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-all shadow-sm border border-blue-100 dark:border-blue-800"
                            title="Adicionar Item"
                        >
                            <i className="bi bi-plus-lg" />
                        </button>
                    </th>
                </tr>
            </thead>
            <Body items={items} setItems={setItems} deliveryMethod={deliveryMethod} errors={errors} isMobile={false} />
            <Footer summary={summary} />
        </table>
    );
};

export default ItemsTable