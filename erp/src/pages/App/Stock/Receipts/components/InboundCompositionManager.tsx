import { toast } from 'react-toastify';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';

export type InboundReceiptItemComposition = {
    id: string;
    productId: string;
    variationId?: string;
    productName: string;
    quantity: number;
    referenceSalePrice: number;
};

interface CompositionManagerProps {
    composition: InboundReceiptItemComposition[];
    onChangeComposition: (newComposition: InboundReceiptItemComposition[]) => void;
    totalItemCost: number;
}

export function InboundCompositionManager({ composition, onChangeComposition, totalItemCost }: CompositionManagerProps) {
    const handleAdd = (prod: Product, variation?: Variation) => {
        const salePrice = variation?.unitPrice || prod.unitPrice || 0;

        const exists = composition.some(c => c.productId === prod.id && c.variationId === variation?.id);
        if (exists) {
            toast.error('Este produto já está na composição. Altere a quantidade se necessário.');
            return;
        }

        const newComp: InboundReceiptItemComposition = {
            id: crypto.randomUUID(),
            productId: prod.id!,
            variationId: variation?.id,
            productName: variation?.name || prod.name || prod.title || 'Produto',
            quantity: 1,
            referenceSalePrice: salePrice,
        };
        onChangeComposition([...composition, newComp]);
    };

    const handleRemove = (id: string) => {
        onChangeComposition(composition.filter(c => c.id !== id));
    };

    const handleUpdateQuantity = (id: string, qty: number) => {
        onChangeComposition(composition.map(c => c.id === id ? { ...c, quantity: Math.max(1, qty) } : c));
    };

    const totalWeightBase = composition.reduce((sum, c) => sum + (c.referenceSalePrice * c.quantity), 0);

    return (
        <div className="space-y-3">
            {composition.length > 0 && (
                <div className="flex flex-col gap-2">
                    {composition.map((c, idx) => {
                        const weightValue = c.referenceSalePrice * c.quantity;
                        const weightPercent = totalWeightBase > 0 ? (weightValue / totalWeightBase) : 0;

                        // Último item absorve a diferença para evitar dízimas que somadas não fecham o total
                        let rateio = 0;
                        if (idx === composition.length - 1) {
                            const previousRateioSum = composition.slice(0, -1).reduce((sum, prevC) => {
                                const w = totalWeightBase > 0 ? ((prevC.referenceSalePrice * prevC.quantity) / totalWeightBase) : 0;
                                return sum + Number((totalItemCost * w).toFixed(2));
                            }, 0);
                            rateio = Math.max(0, totalItemCost - previousRateioSum);
                        } else {
                            rateio = Number((totalItemCost * weightPercent).toFixed(2));
                        }

                        return (
                            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                    <button type="button" onClick={() => handleRemove(c.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0 outline-none">
                                        <i className="bi bi-trash3-fill text-sm"></i>
                                    </button>

                                    <div className="w-16 shrink-0">
                                        <input
                                            type="number"
                                            min="1"
                                            value={c.quantity}
                                            onChange={(e) => handleUpdateQuantity(c.id, Number(e.target.value))}
                                            className="w-full text-center bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none focus:border-blue-500 font-bold"
                                        />
                                    </div>

                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5 truncate max-w-full">
                                        {c.productName}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-[10px] shrink-0 justify-end sm:justify-start">
                                    <div className="flex flex-col text-right">
                                        <span className="text-slate-400 uppercase tracking-widest text-[8px] font-black">Preço Ref.</span>
                                        <span className="font-bold text-slate-600 dark:text-slate-300">R$ {c.referenceSalePrice.toFixed(2)} un</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-slate-400 uppercase tracking-widest text-[8px] font-black">Rateio</span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">R$ {rateio.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ProductAutocomplete
                value=""
                clearOnSelect={true}
                onSelect={handleAdd}
                placeholder="Buscar produto para compor o item..."
            />

            {composition.length === 0 && (
                <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 flex items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    Adicione pelo menos um produto para formar a composição.
                </p>
            )}
            {composition.some(c => c.referenceSalePrice <= 0) && (
                <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 mt-1">
                    <i className="bi bi-info-circle-fill"></i>
                    Alguns itens estão com preço de venda zerado. Isso afetará o cálculo de rateio.
                </p>
            )}
        </div>
    );
}

export default InboundCompositionManager;
