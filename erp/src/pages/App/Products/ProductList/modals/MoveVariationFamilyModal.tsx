import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ensureAttributeValue } from '@/pages/utils/variationService';
import { moveVariationToFamily } from '@/pages/utils/productService';

export interface Family {
    readonly id: string;
    readonly name?: string;
    readonly description?: string;
    readonly code?: string;
}

export interface Attribute {
    name: string;
    value: string;
    showName?: boolean;
}

interface RawAttributeItem {
    readonly name?: string;
    readonly value?: string;
    readonly showName?: boolean;
}

const normalize = (value: unknown): string =>
    String(value || '').trim().toLocaleLowerCase('pt-BR');

const toAttributes = (value: unknown): Attribute[] => {
    if (Array.isArray(value)) {
        return (value as readonly unknown[])
            .filter(Boolean)
            .map((attribute) => {
                const item = attribute as RawAttributeItem;
                return {
                    name: String(item.name || ''),
                    value: String(item.value || ''),
                    showName: item.showName
                };
            });
    }
    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).map(([name, attributeValue]) => ({
            name,
            value: String(attributeValue || '')
        }));
    }
    return [];
};

const hasSameAttributes = (first: readonly Attribute[], second: readonly Attribute[]): boolean => {
    if (first.length !== second.length) return false;
    const secondMap = new Map(second.map((attribute) => [normalize(attribute.name), normalize(attribute.value)]));
    return first.every((attribute) => secondMap.get(normalize(attribute.name)) === normalize(attribute.value));
};

const familyName = (family?: Family | null): string =>
    family?.name || family?.description || 'Produto pai selecionado';

const familySku = (family?: Family | null): string => family?.code || '';

export interface MoveVariationFamilyModalProps {
    readonly variation: (Product & { readonly variationId?: string }) | null;
    readonly onClose: () => void;
    readonly onMoved: () => void;
}

export const MoveVariationFamilyModal: React.FC<MoveVariationFamilyModalProps> = ({
    variation,
    onClose,
    onMoved
}) => {
    const [families, setFamilies] = useState<readonly Family[]>([]);
    const [targetFamilyId, setTargetFamilyId] = useState('');
    const [familySearch, setFamilySearch] = useState('');
    const [isFamilySuggestionsOpen, setIsFamilySuggestionsOpen] = useState(false);
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [hasConflict, setHasConflict] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [isOnlyVariation, setIsOnlyVariation] = useState(false);
    const [saving, setSaving] = useState(false);

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
        if (!variation) return;
        setTargetFamilyId('');
        setFamilySearch('');
        setIsFamilySuggestionsOpen(false);
        setAttributes(toAttributes(variation.attributes));
        setHasConflict(false);
        setCountdown(5);
        setIsOnlyVariation(false);

        if (variation.parentId) {
            supabase
                .from('product_variations')
                .select('id', { count: 'exact', head: true })
                .eq('product_id', variation.parentId)
                .then(({ count }) => {
                    if (count === 1) setIsOnlyVariation(true);
                });
        }

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
            setFamilies((data || []) as readonly Family[]);
        });
    }, [variation]);

    useEffect(() => {
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
                setHasConflict(
                    (data || []).some((candidate) =>
                        hasSameAttributes(attributes, toAttributes(candidate.attributes))
                    )
                );
            });
        return () => {
            active = false;
        };
    }, [variation, targetFamilyId, attributes]);

    useEffect(() => {
        if (!variation || !targetFamilyId || hasConflict || saving) {
            setCountdown(5);
            return;
        }
        if (countdown <= 0) return;
        const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [variation, targetFamilyId, hasConflict, saving, countdown]);

    const updateAttribute = (index: number, field: 'name' | 'value', value: string) => {
        setAttributes((current) =>
            current.map((attribute, attributeIndex) =>
                attributeIndex === index ? { ...attribute, [field]: value } : attribute
            )
        );
    };

    const handleConfirm = useCallback(async () => {
        const selectedFamily = families.find((family) => family.id === targetFamilyId);
        if (!selectedFamily || !variation?.variationId) return;
        const validAttributes = attributes.filter((attribute) => attribute.name.trim() && attribute.value.trim());

        try {
            setSaving(true);
            const canonicalAttributes = await Promise.all(
                validAttributes.map(async (attribute) => {
                    const stored = await ensureAttributeValue(attribute.name, attribute.value);
                    return { ...attribute, ...stored };
                })
            );
            const newName = [familyName(selectedFamily), ...canonicalAttributes.map((attribute) => attribute.value)]
                .filter(Boolean)
                .join(' ');

            const result = await moveVariationToFamily(
                variation.variationId,
                selectedFamily.id,
                canonicalAttributes,
                newName,
                variation.images || [],
                variation.parentId
            );

            if (result?.sourceParentRemoved) {
                toast.success(`Variação movida (novo SKU: ${result.newSku}). O produto pai antigo ficou sem variações e foi removido.`);
            } else {
                toast.success(`Variação movida para o novo produto pai (SKU: ${result?.newSku || 'gerado'}). O ID foi preservado.`);
            }
            onMoved();
            onClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Não foi possível mover o produto.';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }, [families, targetFamilyId, variation, attributes, onMoved, onClose]);

    if (!variation) return null;

    const normalizedFamilySearch = normalize(familySearch);
    const familySuggestions =
        normalizedFamilySearch.length >= 2
            ? families
                  .filter((family) =>
                      `${familyName(family)} ${familySku(family)}`
                          .toLocaleLowerCase('pt-BR')
                          .includes(normalizedFamilySearch)
                  )
                  .slice(0, 8)
            : [];
    const canConfirm = Boolean(targetFamilyId) && !hasConflict && countdown === 0 && !saving;

    const confirmButtonLabel = () => {
        if (saving) return 'Movendo…';
        if (hasConflict) return 'Resolva o conflito';
        if (countdown > 0 && targetFamilyId) return `Confirmar em ${countdown}s`;
        if (isOnlyVariation) return 'Mover e remover produto';
        return 'Confirmar mudança';
    };

    return (
        <div
            className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Mover variação para outro produto pai"
        >
            <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-visible border border-slate-100 dark:border-slate-800">
                <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                            Mover variação para outro produto pai
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            A variação permanece com o mesmo ID; somente o vínculo com o produto pai será alterado.
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

                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {isOnlyVariation ? (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                            <p className="font-bold text-sm text-amber-900 dark:text-amber-200 mb-1">
                                <i className="bi bi-exclamation-triangle-fill mr-2 text-amber-600 dark:text-amber-400" />
                                Esta é a única variação deste produto.
                            </p>
                            <p className="text-xs font-medium leading-relaxed">
                                Ao mover esta variação para o novo produto, o produto de origem ficará sem variações e será removido automaticamente.
                            </p>
                            <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                                A variação manterá o mesmo ID e todo o histórico será preservado.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                            <i className="bi bi-info-circle-fill mr-2 text-amber-600" />
                            O nome da variação pode mudar: ele será formado pelo nome do novo produto pai mais os valores dos atributos da variação.
                        </div>
                    )}

                    <div className="relative z-50">
                        <label htmlFor="new-family-search" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Novo produto pai
                        </label>
                        <input
                            id="new-family-search"
                            value={familySearch}
                            onChange={(event) => {
                                setFamilySearch(event.target.value);
                                setTargetFamilyId('');
                                setIsFamilySuggestionsOpen(true);
                            }}
                            onFocus={() => setIsFamilySuggestionsOpen(true)}
                            placeholder="Digite ao menos 2 letras do nome ou código do produto pai..."
                            autoComplete="off"
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        {isFamilySuggestionsOpen && normalizedFamilySearch.length >= 2 && (
                            <div className="absolute z-[10060] mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                                {familySuggestions.length > 0 ? (
                                    familySuggestions.map((family) => (
                                        <button
                                            type="button"
                                            key={family.id}
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => {
                                                setTargetFamilyId(family.id);
                                                setFamilySearch(`${familyName(family)}${familySku(family) ? ` — ${familySku(family)}` : ''}`);
                                                setIsFamilySuggestionsOpen(false);
                                            }}
                                            className="flex w-full flex-col px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                                {familyName(family)}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                Código: {familySku(family) || 'não informado'}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="p-4 text-xs text-slate-500 text-center font-medium">
                                        Nenhum produto pai encontrado.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {targetFamilyId && (
                        <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
                            <i className="bi bi-images mr-2 text-blue-600" />
                            As fotos já vinculadas a esta variação serão adicionadas automaticamente ao novo produto pai. A variação continuará vinculada às mesmas fotos.
                        </section>
                    )}

                    {hasConflict && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                            <p className="text-xs font-bold text-red-800 dark:text-red-200">
                                Já existe uma variação neste produto pai com esta mesma combinação de atributos.
                            </p>
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                                Escolha um novo atributo ou valor antes de continuar.
                            </p>
                            <div className="mt-3 space-y-2">
                                {attributes.map((attribute, index) => (
                                    <div className="grid grid-cols-2 gap-2" key={`${attribute.name}-${index}`}>
                                        <input
                                            value={attribute.name}
                                            onChange={(event) => updateAttribute(index, 'name', event.target.value)}
                                            placeholder="Atributo"
                                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs dark:border-red-900 dark:bg-slate-900"
                                        />
                                        <input
                                            value={attribute.value}
                                            onChange={(event) => updateAttribute(index, 'value', event.target.value)}
                                            placeholder="Valor"
                                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs dark:border-red-900 dark:bg-slate-900"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!canConfirm}
                        onClick={handleConfirm}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-45 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                        {confirmButtonLabel()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveVariationFamilyModal;
