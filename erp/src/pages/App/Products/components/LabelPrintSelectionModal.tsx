import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/pages/utils/supabaseConfig';

export type LabelPrintType = 'identification' | 'price';

interface ProductItem {
    id: string;
    description: string;
    code?: string;
    sku?: string;
    unitPrice?: number;
    images?: string[];
}

interface LabelPrintSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialProduct: ProductItem;
    labelType: LabelPrintType;
}

interface SelectedProduct {
    product: ProductItem;
    qty: number;
}

const LabelPrintSelectionModal: React.FC<LabelPrintSelectionModalProps> = ({
    isOpen, onClose, initialProduct, labelType
}) => {
    const navigate = useNavigate();
    const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Map<string, SelectedProduct>>(new Map());
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Load all products on open
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setSearch('');

        // Pre-select initial product with qty 1
        const init = new Map<string, SelectedProduct>();
        init.set(initialProduct.id, { product: initialProduct, qty: 1 });
        setSelected(init);

        supabase
            .from('products')
            .select('id, description, code, sku, unit_price, images')
            .eq('active', true)
            .is('parent_id', null)
            .order('description', { ascending: true })
            .then(({ data, error }: { data: any[] | null; error: any }) => {
                if (!error && data) {
                    setAllProducts(data.map((p: any) => ({
                        id: p.id,
                        description: p.description,
                        code: p.code,
                        sku: p.sku,
                        unitPrice: p.unit_price,
                        images: p.images,
                    })));
                }
                setLoading(false);
            });

        setTimeout(() => searchInputRef.current?.focus(), 200);
    }, [isOpen, initialProduct]);

    const toggleProduct = useCallback((product: ProductItem) => {
        setSelected(prev => {
            const next = new Map(prev);
            if (next.has(product.id)) {
                next.delete(product.id);
            } else {
                next.set(product.id, { product, qty: 1 });
            }
            return next;
        });
    }, []);

    const setQty = useCallback((id: string, qty: number) => {
        setSelected(prev => {
            const next = new Map(prev);
            const item = next.get(id);
            if (item) {
                next.set(id, { ...item, qty: Math.max(1, qty) });
            }
            return next;
        });
    }, []);

    const filteredProducts = allProducts.filter(p => {
        const q = search.toLowerCase();
        return (
            p.description?.toLowerCase().includes(q) ||
            p.code?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q)
        );
    });

    // Selected items first, then remaining
    const selectedIds = new Set(selected.keys());
    const orderedProducts = [
        ...filteredProducts.filter(p => selectedIds.has(p.id)),
        ...filteredProducts.filter(p => !selectedIds.has(p.id)),
    ];

    const handleConfirm = () => {
        if (selected.size === 0) return;
        const products = Array.from(selected.values()).map(s => ({
            ...s.product,
            labelQty: s.qty,
        }));
        navigate('/stock/label-printing', {
            state: {
                batchProducts: products,
                labelType,
            }
        });
        onClose();
    };

    if (!isOpen) return null;

    const typeInfo = {
        identification: {
            title: 'Etiqueta de Identificação',
            icon: 'bi-qr-code',
            color: 'blue',
            description: 'Código de barras, SKU e nome do produto',
        },
        price: {
            title: 'Etiqueta de Preço',
            icon: 'bi-tag-fill',
            color: 'emerald',
            description: 'Nome do produto e preço de venda',
        },
    }[labelType];

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">

                {/* Header */}
                <div className={`px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-${typeInfo.color}-50/50 dark:bg-${typeInfo.color}-900/10`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/30 flex items-center justify-center`}>
                            <i className={`bi ${typeInfo.icon} text-${typeInfo.color}-600 dark:text-${typeInfo.color}-400 text-lg`} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                {typeInfo.title}
                            </h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{typeInfo.description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 shrink-0">
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Filtrar produtos..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:focus:border-blue-700 transition-all"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-circle-fill text-sm" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {selected.size} selecionado{selected.size !== 1 ? 's' : ''} · {orderedProducts.length} produto{orderedProducts.length !== 1 ? 's' : ''} encontrado{orderedProducts.length !== 1 ? 's' : ''}
                        </span>
                        {selected.size > 0 && (
                            <button
                                onClick={() => setSelected(new Map())}
                                className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                            >
                                Limpar seleção
                            </button>
                        )}
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-3">
                                <i className="bi bi-arrow-repeat animate-spin text-3xl text-blue-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando produtos...</span>
                            </div>
                        </div>
                    ) : orderedProducts.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                <i className="bi bi-search text-3xl" />
                                <span className="text-xs font-bold uppercase tracking-widest">Nenhum produto encontrado</span>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {orderedProducts.map((product) => {
                                const isChecked = selectedIds.has(product.id);
                                const selItem = selected.get(product.id);
                                const isSeparator = !isChecked && selectedIds.size > 0 &&
                                    orderedProducts.indexOf(product) === selectedIds.size;

                                return (
                                    <React.Fragment key={product.id}>
                                        {isSeparator && (
                                            <div className="px-6 py-2 bg-slate-50 dark:bg-slate-950 border-t border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Outros produtos</span>
                                            </div>
                                        )}
                                        <div
                                            className={`flex items-center gap-4 px-6 py-3 transition-colors cursor-pointer group ${isChecked
                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                                }`}
                                            onClick={() => toggleProduct(product)}
                                        >
                                            {/* Checkbox */}
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isChecked
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'border-slate-300 dark:border-slate-700 group-hover:border-blue-400'
                                                }`}>
                                                {isChecked && <i className="bi bi-check text-white text-[10px] font-black" />}
                                            </div>

                                            {/* Thumbnail */}
                                            <div className="shrink-0">
                                                {product.images?.[0] ? (
                                                    <img src={product.images[0]} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-100 dark:border-slate-800" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300">
                                                        <i className="bi bi-image text-sm" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold truncate ${isChecked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {product.description}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {product.sku || product.code || '—'}
                                                    {product.unitPrice ? ` · R$ ${product.unitPrice.toFixed(2).replace('.', ',')}` : ''}
                                                </p>
                                            </div>

                                            {/* Quantity Input - only shown when selected */}
                                            {isChecked && (
                                                <div
                                                    className="flex items-center gap-1 shrink-0"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => setQty(product.id, (selItem?.qty || 1) - 1)}
                                                        disabled={(selItem?.qty || 1) <= 1}
                                                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black"
                                                    >−</button>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={selItem?.qty || 1}
                                                        onChange={e => setQty(product.id, parseInt(e.target.value) || 1)}
                                                        className="w-12 text-center text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg py-1 outline-none focus:ring-2 focus:ring-blue-400"
                                                    />
                                                    <button
                                                        onClick={() => setQty(product.id, (selItem?.qty || 1) + 1)}
                                                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-all flex items-center justify-center text-xs font-black"
                                                    >+</button>
                                                    <span className="text-[9px] text-slate-400 font-bold ml-1">un</span>
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {Array.from(selected.values()).reduce((acc, s) => acc + s.qty, 0)} etiqueta{Array.from(selected.values()).reduce((acc, s) => acc + s.qty, 0) !== 1 ? 's' : ''} no total
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{selected.size} produto{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all">
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selected.size === 0}
                            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${labelType === 'identification'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200/50'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50'
                                }`}
                        >
                            <i className="bi bi-printer-fill" />
                            Imprimir Etiquetas
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LabelPrintSelectionModal;
