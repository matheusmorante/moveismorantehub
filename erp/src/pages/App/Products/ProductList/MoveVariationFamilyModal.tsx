import React from 'react';
import { toast } from 'react-toastify';
import Product from '../../../types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ensureAttributeValue } from '@/pages/utils/variationService';
import { moveVariationToFamily } from '@/pages/utils/productService';

type Family = { id: string; name?: string; description?: string; code?: string };
type Attribute = { name: string; value: string; showName?: boolean };

const normalize = (value: unknown) => String(value || '').trim().toLocaleLowerCase('pt-BR');

const toAttributes = (value: unknown): Attribute[] => {
    if (Array.isArray(value)) return value.filter(Boolean).map((attribute: any) => ({ name: String(attribute.name || ''), value: String(attribute.value || ''), showName: attribute.showName }));
    if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([name, attributeValue]) => ({ name, value: String(attributeValue || '') }));
    return [];
};

const hasSameAttributes = (first: Attribute[], second: Attribute[]) => {
    if (first.length !== second.length) return false;
    const secondMap = new Map(second.map(attribute => [normalize(attribute.name), normalize(attribute.value)]));
    return first.every(attribute => secondMap.get(normalize(attribute.name)) === normalize(attribute.value));
};

const familyName = (family?: Family | null) => family?.name || family?.description || 'Produto pai selecionado';
const familySku = (family?: Family | null) => family?.code || '';

interface MoveVariationFamilyModalProps {
    variation: (Product & { variationId?: string }) | null;
    onClose: () => void;
    onMoved: () => void;
}

export const MoveVariationFamilyModal: React.FC<MoveVariationFamilyModalProps> = ({ variation, onClose, onMoved }) => {
    const [families, setFamilies] = React.useState<Family[]>([]);
    const [targetFamilyId, setTargetFamilyId] = React.useState('');
    const [familySearch, setFamilySearch] = React.useState('');
    const [isFamilySuggestionsOpen, setIsFamilySuggestionsOpen] = React.useState(false);
    const [attributes, setAttributes] = React.useState<Attribute[]>([]);
    const [hasConflict, setHasConflict] = React.useState(false);
    const [countdown, setCountdown] = React.useState(5);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!variation) return;
        setTargetFamilyId('');
        setFamilySearch('');
        setIsFamilySuggestionsOpen(false);
        setAttributes(toAttributes((variation as any).attributes));
        setHasConflict(false);
        setCountdown(5);

        let query = supabase
            .from('products')
            .select('id, name, description, code')
            .eq('deleted', false)
            .not('code', 'is', null)
            .neq('code', '')
            .order('name', { ascending: true });
        if (variation.parentId) query = query.neq('id', variation.parentId);
        query.then(({ data, error }) => {
                if (error) {
                    toast.error('Não foi possível carregar os produtos pai.');
                    return;
                }
                setFamilies((data || []) as Family[]);
            });
    }, [variation]);

    React.useEffect(() => {
        if (!variation || !targetFamilyId) {
            setHasConflict(false);
            return;
        }
        let active = true;
        supabase
            .from('product_variations')
            .select('id, attributes')
            .eq('product_id', targetFamilyId)
            .then(({ data, error }) => {
                if (!active) return;
                if (error) {
                    toast.error('Não foi possível validar as variações do produto pai.');
                    setHasConflict(true);
                    return;
                }
                setHasConflict((data || []).some(candidate => hasSameAttributes(attributes, toAttributes(candidate.attributes))));
            });
        return () => { active = false; };
    }, [variation, targetFamilyId, attributes]);

    React.useEffect(() => {
        if (!variation || !targetFamilyId || hasConflict || saving) {
            setCountdown(5);
            return;
        }
        if (countdown <= 0) return;
        const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [variation, targetFamilyId, hasConflict, saving, countdown]);

    if (!variation) return null;

    const selectedFamily = families.find(family => family.id === targetFamilyId);
    const normalizedFamilySearch = normalize(familySearch);
    const familySuggestions = normalizedFamilySearch.length >= 2
        ? families.filter(family => `${familyName(family)} ${familySku(family)}`.toLocaleLowerCase('pt-BR').includes(normalizedFamilySearch)).slice(0, 8)
        : [];
    const canConfirm = Boolean(targetFamilyId) && !hasConflict && countdown === 0 && !saving;

    const updateAttribute = (index: number, field: 'name' | 'value', value: string) => {
        setAttributes(current => current.map((attribute, attributeIndex) => attributeIndex === index ? { ...attribute, [field]: value } : attribute));
    };

    const handleConfirm = async () => {
        if (!selectedFamily || !variation.variationId || !canConfirm) return;
        const validAttributes = attributes.filter(attribute => attribute.name.trim() && attribute.value.trim());
        try {
            setSaving(true);
            const canonicalAttributes = await Promise.all(validAttributes.map(async attribute => {
                const stored = await ensureAttributeValue(attribute.name, attribute.value);
                return { ...attribute, ...stored };
            }));
            const newName = [familyName(selectedFamily), ...canonicalAttributes.map(attribute => attribute.value)].filter(Boolean).join(' ');
            await moveVariationToFamily(
                variation.variationId,
                selectedFamily.id,
                canonicalAttributes,
                newName,
                variation.images || [],
                variation.parentId,
            );
            toast.success('Variação movida para o novo produto pai. O ID foi preservado.');
            onMoved();
            onClose();
        } catch (error: any) {
            toast.error(error?.message || 'Não foi possível mover o produto.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/55" role="dialog" aria-modal="true" aria-label="Mover variação para outro produto pai">
            <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-visible">
                <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Mover variação para outro produto pai</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A variação permanece com o mesmo ID; somente o vínculo com o produto pai será alterado.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Fechar"><i className="bi bi-x-lg" /></button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        <i className="bi bi-info-circle-fill mr-2" />
                        O nome da variação pode mudar: ele será formado pelo nome do novo produto pai mais os valores dos atributos da variação. Se ela for a última variação, o produto pai antigo será desativado.
                    </div>

                    <div className="relative z-50">
                        <label htmlFor="new-family-search" className="block text-sm font-bold text-slate-700 dark:text-slate-200">Novo produto pai</label>
                        <input
                            id="new-family-search"
                            value={familySearch}
                            onChange={event => {
                                setFamilySearch(event.target.value);
                                setTargetFamilyId('');
                                setIsFamilySuggestionsOpen(true);
                            }}
                            onFocus={() => setIsFamilySuggestionsOpen(true)}
                            placeholder="Digite ao menos 2 letras do nome ou código do produto pai"
                            autoComplete="off"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        {isFamilySuggestionsOpen && normalizedFamilySearch.length >= 2 && (
                            <div className="absolute z-[10060] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                                {familySuggestions.length > 0 ? familySuggestions.map(family => (
                                    <button
                                        type="button"
                                        key={family.id}
                                        onMouseDown={event => event.preventDefault()}
                                        onClick={() => {
                                            setTargetFamilyId(family.id);
                                            setFamilySearch(`${familyName(family)}${familySku(family) ? ` — ${familySku(family)}` : ''}`);
                                            setIsFamilySuggestionsOpen(false);
                                        }}
                                        className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-slate-800"
                                    >
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{familyName(family)}</span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Código do produto pai: {familySku(family) || 'não informado'}</span>
                                    </button>
                                )) : <p className="px-3 py-3 text-xs text-slate-500">Nenhum produto pai encontrado.</p>}
                            </div>
                        )}
                        {normalizedFamilySearch.length > 0 && normalizedFamilySearch.length < 2 && <p className="mt-1 text-xs text-slate-500">Digite pelo menos 2 caracteres para pesquisar.</p>}
                    </div>

                    {targetFamilyId && (
                        <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
                            <i className="bi bi-images mr-2" />
                            As fotos já vinculadas a esta variação serão adicionadas automaticamente ao novo produto pai. A variação continuará vinculada às mesmas fotos.
                        </section>
                    )}

                    {hasConflict && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                            <p className="text-sm font-bold text-red-800 dark:text-red-200">Já existe uma variação neste produto pai com esta mesma combinação de atributos.</p>
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">Escolha um novo atributo ou valor antes de continuar. O valor informado será reaproveitado ou criado na lista de atributos.</p>
                            <div className="mt-3 space-y-2">
                                {attributes.map((attribute, index) => (
                                    <div className="grid grid-cols-2 gap-2" key={`${attribute.name}-${index}`}>
                                        <input value={attribute.name} onChange={event => updateAttribute(index, 'name', event.target.value)} placeholder="Atributo" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm dark:border-red-900 dark:bg-slate-900" />
                                        <input value={attribute.value} onChange={event => updateAttribute(index, 'value', event.target.value)} placeholder="Valor" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm dark:border-red-900 dark:bg-slate-900" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                    <button type="button" disabled={!canConfirm} onClick={handleConfirm} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
                        {saving ? 'Movendo…' : hasConflict ? 'Resolva o conflito' : countdown > 0 && targetFamilyId ? `Confirmar em ${countdown}s` : 'Confirmar mudança'}
                    </button>
                </div>
            </div>
        </div>
    );
};
