import React from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { mergeVariationIntoCanonical } from '@/pages/utils/productService';

type VariationOption = { id: string; name: string; sku?: string | null; product?: { name?: string | null; description?: string | null } | null };

interface Props {
    variation: { variationId?: string; id?: string; name?: string; sku?: string; parentId?: string } | null;
    onClose: () => void;
    onMerged: () => void;
}

export const MergeVariationModal: React.FC<Props> = ({ variation, onClose, onMerged }) => {
    const [query, setQuery] = React.useState('');
    const [options, setOptions] = React.useState<VariationOption[]>([]);
    const [target, setTarget] = React.useState<VariationOption | null>(null);
    const [saving, setSaving] = React.useState(false);

    const sourceId = String(variation?.variationId || variation?.id || '');

    React.useEffect(() => {
        if (!variation || query.trim().length < 2) { setOptions([]); return; }
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
                if (error) { toast.error('Não foi possível buscar variações.'); return; }
                setOptions((data || []) as VariationOption[]);
            });
        return () => { active = false; };
    }, [variation, query, sourceId]);

    if (!variation) return null;
    const sourceLabel = variation.name || variation.sku || sourceId;

    const confirm = async () => {
        if (!target || !sourceId || saving) return;
        try {
            setSaving(true);
            const result = await mergeVariationIntoCanonical(sourceId, target.id);
            toast.success(`Variação fundida. ${result.transferredSupplierIds.length} fornecedor(es) exclusivo(s) foram incorporados ao canônico.`);
            onMerged(); onClose();
        } catch (error: any) {
            toast.error(error?.message || 'Não foi possível fundir as variações.');
        } finally { setSaving(false); }
    };

    return <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
                <div><h2 className="text-lg font-black text-slate-800 dark:text-white">Fundir com outra variação</h2><p className="mt-1 text-sm text-slate-500">“{sourceLabel}” continuará com seu UUID histórico e passará a apontar para a variação canônica.</p></div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fechar"><i className="bi bi-x-lg" /></button>
            </div>
            <div className="space-y-4 p-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><i className="bi bi-shield-check mr-2" />Movimentações, recebimentos, quantidades, custos e fornecedor histórico não serão alterados.</div>
                <div><label className="text-sm font-bold text-slate-700 dark:text-slate-200">Variação canônica de destino</label><input autoFocus value={query} onChange={e => { setQuery(e.target.value); setTarget(null); }} placeholder="Pesquise por nome ou SKU" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    {!target && query.trim().length >= 2 && <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">{options.map(option => <button type="button" key={option.id} onClick={() => { setTarget(option); setQuery(option.name); setOptions([]); }} className="flex w-full flex-col border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800"><span className="font-bold text-slate-800 dark:text-white">{option.name}</span><span className="text-xs text-slate-500">{option.product?.name || option.product?.description || 'Produto pai'} {option.sku ? `• ${option.sku}` : ''}</span></button>)}{options.length === 0 && <p className="px-3 py-3 text-sm text-slate-500">Nenhuma variação encontrada.</p>}</div>}</div>
                {target && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">Destino selecionado: <strong>{target.name}</strong>{target.sku ? ` (${target.sku})` : ''}.</div>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 p-5 dark:border-slate-800"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancelar</button><button type="button" disabled={!target || saving} onClick={confirm} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{saving ? 'Fundindo…' : 'Confirmar fusão'}</button></div>
        </div>
    </div>;
};
