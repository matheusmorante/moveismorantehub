import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { mergeVariationIntoCanonical } from '@/pages/utils/productService';

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
    } | null;
    readonly onClose: () => void;
    readonly onMerged: () => void;
}

export const MergeVariationModal: React.FC<MergeVariationModalProps> = ({ variation, onClose, onMerged }) => {
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<readonly VariationOption[]>([]);
    const [target, setTarget] = useState<VariationOption | null>(null);
    const [saving, setSaving] = useState(false);

    const sourceId = String(variation?.variationId || variation?.id || '');

    useEffect(() => {
        if (!variation) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [variation, saving, onClose]);

    useEffect(() => {
        if (!variation || query.trim().length < 2) {
            setOptions([]);
            return;
        }
        let active = true;
        const term = query.trim();
        supabase.from('product_variations')
            .select('id, name, sku, product:products(name, description)')
            .neq('id', sourceId)
            .is('merged_to_variation_id', null)
            .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
            .limit(12)
            .then(({ data, error }) => {
                if (!active) return;
                if (error) {
                    toast.error('Não foi possível buscar variações.');
                    return;
                }
                setOptions((data || []) as unknown as readonly VariationOption[]);
            });

        return () => {
            active = false;
        };
    }, [variation, query, sourceId]);

    const confirm = useCallback(async () => {
        if (!target || !sourceId || saving) return;
        try {
            setSaving(true);
            const result = await mergeVariationIntoCanonical(sourceId, target.id);
            toast.success(`Variação fundida. ${result.transferredSupplierIds.length} fornecedor(es) exclusivo(s) foram incorporados ao canônico.`);
            onMerged();
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Não foi possível fundir as variações.';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }, [target, sourceId, saving, onMerged, onClose]);

    if (!variation) return null;
    const sourceLabel = variation.name || variation.sku || sourceId;

    return (
        <div
            className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-variation-title"
        >
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-slate-800">
                    <div>
                        <h2 id="merge-variation-title" className="text-lg font-black text-slate-800 dark:text-white">
                            Fundir com outra variação
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
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setTarget(null);
                            }}
                            placeholder="Pesquise por nome ou SKU..."
                            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />

                        {!target && query.trim().length >= 2 && (
                            <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                                {options.map((option) => (
                                    <button
                                        type="button"
                                        key={option.id}
                                        onClick={() => {
                                            setTarget(option);
                                            setQuery(option.name);
                                            setOptions([]);
                                        }}
                                        className="flex w-full flex-col p-3 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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

                    {target && (
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-300 font-medium">
                            Destino selecionado: <strong className="font-bold text-indigo-700 dark:text-indigo-300">{target.name}</strong>{target.sku ? ` (SKU: ${target.sku})` : ''}.
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 p-6 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                        type="button"
                        onClick={onClose}
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
                        {saving ? 'Fundindo…' : 'Confirmar fusão'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MergeVariationModal;
