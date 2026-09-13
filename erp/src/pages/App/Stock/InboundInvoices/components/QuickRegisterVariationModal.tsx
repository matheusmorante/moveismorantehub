import React, { useEffect, useState } from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { toast } from 'react-toastify';

export type QuickRegisterItem = {
    productDescription: string;
    productCode?: string;
    unit?: string;
    ncm?: string;
    quantity: number;
    unitCost: number;
    finalCost?: number;
};

export type QuickRegisterSelection =
    | { mode: 'EXISTING_PARENT'; parentProductId: string; parentProductName: string }
    | { mode: 'NEW_PARENT' };

interface QuickRegisterVariationModalProps {
    isOpen: boolean;
    item: QuickRegisterItem | null;
    supplierId?: string;
    onClose: () => void;
    onConfirmSelection: (selection: QuickRegisterSelection) => void;
}

export function QuickRegisterVariationModal({
    isOpen,
    item,
    supplierId,
    onClose,
    onConfirmSelection,
}: QuickRegisterVariationModalProps) {
    const [mode, setMode] = useState<'EXISTING_PARENT' | 'NEW_PARENT'>('EXISTING_PARENT');
    const [selectedParent, setSelectedParent] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setMode('EXISTING_PARENT');
        setSelectedParent(null);
    }, [isOpen]);

    if (!isOpen || !item) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'EXISTING_PARENT') {
            if (!selectedParent?.id) {
                toast.warning('Selecione o produto pai.');
                return;
            }
            onConfirmSelection({
                mode: 'EXISTING_PARENT',
                parentProductId: selectedParent.id,
                parentProductName: selectedParent.name,
            });
        } else {
            onConfirmSelection({
                mode: 'NEW_PARENT',
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                            <i className="bi bi-diagram-3 text-lg" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                                Selecionar Tipo de Cadastramento
                            </h3>
                            <p className="text-xs text-slate-500">Selecione como deseja cadastrar o item da NF-e no ERP</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    >
                        <i className="bi bi-x-lg text-sm" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Seleção do Modo de Cadastro */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Tipo de Cadastramento
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMode('EXISTING_PARENT')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                                    mode === 'EXISTING_PARENT'
                                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <i className="bi bi-diagram-3 text-xl mb-1.5" />
                                <span className="text-xs font-bold">Variação em Pai Existente</span>
                                <span className="text-[10px] text-slate-500 mt-1">Vincular a um produto pai já cadastrado</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode('NEW_PARENT')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                                    mode === 'NEW_PARENT'
                                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <i className="bi bi-folder-plus text-xl mb-1.5" />
                                <span className="text-xs font-bold">Novo Produto Pai + Variação</span>
                                <span className="text-[10px] text-slate-500 mt-1">Criar um produto inteiramente novo</span>
                            </button>
                        </div>
                    </div>

                    {/* Seleção do Produto Pai quando no modo EXISTING_PARENT */}
                    {mode === 'EXISTING_PARENT' && (
                        <div className="space-y-1.5 pt-1">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Produto Pai <span className="text-rose-500">*</span>
                            </label>
                            <ProductAutocomplete
                                supplierId={supplierId}
                                value={selectedParent?.name || ''}
                                isSelected={Boolean(selectedParent)}
                                placeholder="Digite 2 ou mais letras para buscar o produto pai..."
                                onSelect={(prod) => setSelectedParent({ id: prod.id, name: prod.name || prod.title || '' })}
                            />
                        </div>
                    )}

                    {/* Footer / Botões */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={mode === 'EXISTING_PARENT' && !selectedParent}
                            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
                        >
                            <i className="bi bi-box-arrow-up-right text-xs" />
                            <span>Abrir Cadastramento</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

