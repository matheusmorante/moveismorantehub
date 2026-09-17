import React from 'react';
import { useMergeVariation } from './MergeVariation/useMergeVariation';

export interface VariationOption {
    readonly id: string;
    readonly name: string;
    readonly sku?: string | null;
    readonly product?: {
        readonly name?: string | null;
        readonly description?: string | null;
    } | null;
}

export interface MergeVariationModalProps {
    readonly variation: {
        readonly variationId?: string;
        readonly id?: string;
        readonly name?: string;
        readonly sku?: string;
        readonly parentId?: string;
        readonly supplierId?: string;
    } | null;
    readonly onClose: () => void;
    readonly onMerged: () => void;
}

export const MergeVariationModal: React.FC<MergeVariationModalProps> = ({ variation, onClose, onMerged }) => {
    const {
        query,
        setQuery,
        options,
        setOptions,
        target,
        setTarget,
        saving,
        sourceId,
        confirm,
        handleCancel
    } = useMergeVariation(variation, onMerged, onClose);

    if (!variation) return null;
    const sourceLabel = variation.name || variation.sku || sourceId;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop com blur dinâmico */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={handleCancel}
                aria-hidden="true"
            />
            <div
                className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden z-10 m-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="merge-variation-title"
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-slate-800">
                    <div>
                        <h2 id="merge-variation-title" className="text-lg font-black text-slate-800 dark:text-white">
                            Mesclar com outra variação
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            “{sourceLabel}” continuará com seu UUID histórico e passará a apontar para a variação canônica.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        aria-label="Fechar"
                    >
                        <i className="bi bi-x-lg text-base" />
                    </button>
                </div>

                <div className="space-y-4 p-6">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                        <i className="bi bi-shield-check mr-2 text-amber-600" />
                        Movimentações, recebimentos, quantidades, custos e fornecedor histórico não serão alterados.
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Variação canônica de destino
                        </label>
                        <div className="relative mt-2">
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setTarget(null);
                                }}
                                placeholder="Pesquise por nome ou SKU..."
                                className={`w-full border-b-2 px-2 py-2.5 text-sm bg-transparent focus:outline-none transition-colors pr-10 ${
                                    target 
                                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold focus:border-emerald-500' 
                                        : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500'
                                }`}
                            />
                            {target && (
                                <i className="bi bi-check-lg absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-lg font-bold" />
                            )}
                        </div>

                        {!target && query.trim().length >= 2 && (
                            <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 shadow-lg">
                                {options.map((option) => (
                                    <button
                                        type="button"
                                        key={option.id}
                                        onClick={() => {
                                            setTarget(option);
                                            setQuery(option.name);
                                            setOptions([]);
                                        }}
                                        className="flex w-full flex-col p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        <span className="font-bold text-sm text-slate-800 dark:text-white">
                                            {option.name}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {option.product?.name || option.product?.description || 'Produto pai'} {option.sku ? `• SKU: ${option.sku}` : ''}
                                        </span>
                                    </button>
                                ))}
                                {options.length === 0 && (
                                    <p className="p-4 text-xs text-slate-500 text-center font-medium">
                                        Nenhuma variação encontrada.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 p-6 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!target || saving}
                        onClick={confirm}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                        {saving ? 'Mesclando…' : 'Confirmar mesclagem'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MergeVariationModal;
