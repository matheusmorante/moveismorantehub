import React, { useState } from "react";
import Footer from "./Footer";
import Body from "./Body";
import { Item, ItemsSummary } from "../../../types/items.type";
import { ValidationErrors } from "../../../utils/validations";
import { useWindowSize } from "../../../../hooks/useWindowSize";

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
    onTabChange: externalOnTabChange
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

    const productsCount = items.filter(i => i.itemType !== 'service').length;
    const servicesCount = items.filter(i => i.itemType === 'service').length;

    const addProduct = () => {
        const newItemIndex = items.length;
        setItems((prev: Item[]) => [
            ...prev,
            {
                description: '',
                quantity: 1,
                unitPrice: 0,
                unitDiscount: 0,
                discountType: 'fixed',
                handlingType: '',
                itemType: 'product',
                orderItemId: crypto.randomUUID()
            }
        ]);
        setActiveTab('products');
        setExpandedIndex(newItemIndex);
    };

    const addService = () => {
        const newItemIndex = items.length;
        setItems((prev: Item[]) => [
            ...prev,
            {
                description: '',
                quantity: 1,
                unitPrice: 0,
                unitDiscount: 0,
                discountType: 'fixed',
                handlingType: '',
                itemType: 'service',
                orderItemId: crypto.randomUUID()
            }
        ]);
        setActiveTab('services');
        setExpandedIndex(newItemIndex);
    };

    const handleAddCurrent = () => {
        if (activeTab === 'services') {
            addService();
        } else {
            addProduct();
        }
    };

    const { width } = useWindowSize();
    const isCardsView = width < 1280; // Visualização em cards para telas menores que XL (< 1280px)

    return (
        <div className="flex flex-col gap-3 p-0 h-full w-full">
            {/* Barra de Abas Internas: [ Produtos (X) ] [ Serviços (Y) ] e Botão de Adicionar */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                    <button
                        type="button"
                        onClick={() => setActiveTab('products')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                            activeTab === 'products'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <i className="bi bi-box-seam text-xs" />
                        <span>Produtos</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            activeTab === 'products'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                            {productsCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('services')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                            activeTab === 'services'
                                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <i className="bi bi-tools text-xs" />
                        <span>Serviços</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            activeTab === 'services'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                            {servicesCount}
                        </span>
                    </button>
                </div>

                {/* Botão de Adicionar contextual à aba ativa */}
                <button
                    type="button"
                    onClick={handleAddCurrent}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 ${
                        activeTab === 'services'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    }`}
                >
                    <i className="bi bi-plus-lg text-xs" />
                    <span>{activeTab === 'services' ? 'Adicionar serviço' : 'Adicionar produto'}</span>
                </button>
            </div>

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
                        <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800">
                            <tr>
                                <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    {activeTab === 'services' ? 'Serviço' : 'Produto'} <span className="text-red-500">*</span>
                                </th>
                                {!hideHandling && (
                                    <th className="px-2 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[140px]">
                                        {activeTab === 'services' ? '-' : <>Manuseio <span className="text-red-500">*</span></>}
                                    </th>
                                )}
                                <th className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[80px]">
                                    Qtd. <span className="text-red-500">*</span>
                                </th>
                                <th className="px-2 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]">
                                    Preço Un. <span className="text-red-500">*</span>
                                </th>
                                <th className="px-2 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[100px]">
                                    Desc. R$
                                </th>
                                <th className="px-2 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[85px]">
                                    Desc. %
                                </th>
                                <th className="px-2 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[110px]" title="Preço Unitário Líquido">
                                    Preço Un. Líq.
                                </th>
                                <th className="px-2 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-[105px]">
                                    Total
                                </th>
                                <th className="px-2 py-2.5 text-center border-none bg-transparent w-[50px]"></th>
                            </tr>
                        </thead>
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
