import React, { useState, useMemo } from 'react';
import {
    ReconciliationProductItem,
    ReconciliationVariationItem,
    ProductPendency
} from '../types/reconciliation.types';
import SupplierAutocomplete from '../../../../../components/SupplierAutocomplete';
import CategoryAutocomplete from '../../../../../components/CategoryAutocomplete';
import { VariationAttributeValueInput } from '../../components/variationTabs/VariationAttributeValueInput';
import { toast } from 'react-toastify';

interface Props {
    product: ReconciliationProductItem;
    isSelected: boolean;
    onToggleSelect: (checked: boolean) => void;
    onSaveProduct: (
        productId: string,
        productUpdates: {
            mainSupplierId?: string;
            categoryId?: string;
            ncm?: string;
            price?: number;
        },
        variationUpdates?: Array<{
            id: string;
            price?: number;
            attributes?: Array<{ name: string; value: string; showName?: boolean }>;
        }>
    ) => Promise<boolean>;
}

export const ReconciliationProductCard: React.FC<Props> = ({
    product,
    isSelected,
    onToggleSelect,
    onSaveProduct
}) => {
    // Estado local para edições inline do pai
    const [supplierId, setSupplierId] = useState<string>(product.mainSupplierId || product.supplierId || '');
    const [categoryId, setCategoryId] = useState<string>(product.categoryId || (product.categoryIds?.[0]) || '');
    const [categoryName, setCategoryName] = useState<string>(product.category || '');
    const [ncm, setNcm] = useState<string>(product.fiscal?.ncm || '');
    const [price, setPrice] = useState<string>(product.price ? String(product.price) : '');

    // Estado local para variações
    const [variations, setVariations] = useState<ReconciliationVariationItem[]>(product.variations || []);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Rastreia se houve alterações
    const [hasChanges, setHasChanges] = useState(false);

    // Calcular pendências ativas locais em tempo real
    const activeParentPendencies = useMemo(() => {
        return product.pendencies.filter(p => {
            if (p.level !== 'parent') return false;
            if (p.type === 'supplier' && supplierId.trim()) return false;
            if (p.type === 'category' && (categoryId.trim() || categoryName.trim())) return false;
            if (p.type === 'ncm' && ncm.trim().length >= 4) return false;
            if (p.type === 'price' && Number(price) > 0) return false;
            return true;
        });
    }, [product.pendencies, supplierId, categoryId, categoryName, ncm, price]);

    const activeVariationPendencies = useMemo(() => {
        return product.pendencies.filter(p => {
            if (p.level !== 'variation') return false;
            const currentVar = variations.find(v => v.id === p.variationId);
            if (!currentVar) return true;

            if (p.type === 'variation_price' && Number(currentVar.price) > 0) return false;

            if (p.type === 'category_attribute' || p.type === 'incomplete_attribute') {
                const attr = (currentVar.attributes || []).find(
                    a => a.name.toLowerCase().trim() === (p.attributeName || '').toLowerCase().trim()
                );
                if (attr && attr.value && attr.value.trim()) return false;
            }
            return true;
        });
    }, [product.pendencies, variations]);

    const totalActivePendencies = activeParentPendencies.length + activeVariationPendencies.length;

    // Manipulação de atributos da variação
    const handleUpdateVariationAttribute = (variationId: string, attrName: string, newValue: string) => {
        setVariations(prev => prev.map(v => {
            if (v.id !== variationId) return v;
            const attrs = [...(v.attributes || [])];
            const existingIdx = attrs.findIndex(a => a.name.toLowerCase().trim() === attrName.toLowerCase().trim());
            if (existingIdx >= 0) {
                attrs[existingIdx] = { ...attrs[existingIdx], value: newValue };
            } else {
                attrs.push({ name: attrName, value: newValue, showName: true });
            }
            return { ...v, attributes: attrs };
        }));
        setHasChanges(true);
    };

    // Aplicar atributo a todas as variações (Resolução de herança)
    const handleApplySharedAttribute = (attrName: string, value: string) => {
        if (!value.trim()) return;
        setVariations(prev => prev.map(v => {
            const attrs = [...(v.attributes || [])];
            const existingIdx = attrs.findIndex(a => a.name.toLowerCase().trim() === attrName.toLowerCase().trim());
            if (existingIdx >= 0) {
                attrs[existingIdx] = { ...attrs[existingIdx], value };
            } else {
                attrs.push({ name: attrName, value, showName: true });
            }
            return { ...v, attributes: attrs };
        }));
        setHasChanges(true);
        toast.info(`Atributo "${attrName}" aplicado a todas as ${variations.length} variações.`);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const productUpdates: any = { id: product.id };
            if (supplierId) productUpdates.mainSupplierId = supplierId;
            if (categoryId) productUpdates.categoryId = categoryId;
            if (ncm) productUpdates.ncm = ncm;
            if (price) productUpdates.price = Number(price);

            const variationUpdates = variations.map(v => ({
                id: v.id,
                price: v.price,
                attributes: v.attributes
            }));

            const success = await onSaveProduct(product.id, productUpdates, variationUpdates);
            if (success) {
                setHasChanges(false);
                toast.success(`Alterações salvas para "${product.name}"!`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Identificar pendências de herança no pai
    const sharedAttributePendencies = product.pendencies.filter(
        p => p.level === 'parent' && p.resolvesVariationsCount && p.resolvesVariationsCount > 1 && p.attributeName
    );

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all shadow-sm overflow-hidden ${
            isSelected
                ? 'border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}>
            {/* ── Topo do Card ──────────────────────────────────────────────── */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onToggleSelect(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-purple-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-purple-500 cursor-pointer"
                    />

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate max-w-md">
                                {product.name}
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                {product.code || product.sku || 'S/ CÓDIGO'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500">
                            {product.category && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                    <i className="bi bi-tag text-purple-500"></i> {product.category}
                                </span>
                            )}
                            {product.people?.tradeName && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                    <i className="bi bi-truck text-blue-500"></i> {product.people.tradeName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    {/* Badge de Pendências */}
                    {totalActivePendencies > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider">
                            <i className="bi bi-exclamation-triangle-fill text-amber-500"></i>
                            {totalActivePendencies} {totalActivePendencies === 1 ? 'pendência' : 'pendências'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                            <i className="bi bi-check-circle-fill text-emerald-500"></i>
                            Concluído
                        </span>
                    )}

                    {/* Botão Salvar se houver alterações */}
                    {hasChanges && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <i className="bi bi-arrow-repeat animate-spin"></i>
                            ) : (
                                <i className="bi bi-check2"></i>
                            )}
                            Salvar
                        </button>
                    )}

                    {/* Alternar Expansão de Variações */}
                    {variations.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={isExpanded ? 'Recolher variações' : 'Ver variações'}
                        >
                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} text-xs`}></i>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Conteúdo Orientado a Pendências ─────────────────────────────── */}
            <div className="p-4 sm:p-5 space-y-4">

                {/* 1. SEÇÃO PRODUTO PAI (Exibida SOMENTE se houver pendência no pai) */}
                {activeParentPendencies.length > 0 && (
                    <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 p-3 sm:p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-300">
                                Pendências do Produto (Pai)
                            </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Fornecedor Principal */}
                            {activeParentPendencies.some(p => p.type === 'supplier') && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider flex items-center gap-1">
                                        <i className="bi bi-exclamation-circle"></i> Fornecedor Principal
                                    </label>
                                    <SupplierAutocomplete
                                        suppliers={[]}
                                        selectedSupplierId={supplierId}
                                        onSelect={(id) => {
                                            setSupplierId(id);
                                            setHasChanges(true);
                                        }}
                                        placeholder="Buscar fornecedor..."
                                        hideLabel={true}
                                        inputClassName="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20"
                                    />
                                </div>
                            )}

                            {/* Categoria */}
                            {activeParentPendencies.some(p => p.type === 'category') && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider flex items-center gap-1">
                                        <i className="bi bi-exclamation-circle"></i> Categoria
                                    </label>
                                    <CategoryAutocomplete
                                        selectedIds={categoryId ? [categoryId] : []}
                                        onSelect={(cat) => {
                                            setCategoryId(cat.id);
                                            setCategoryName(cat.name);
                                            setHasChanges(true);
                                        }}
                                        onRemove={() => {
                                            setCategoryId('');
                                            setCategoryName('');
                                            setHasChanges(true);
                                        }}
                                        placeholder="Selecionar categoria..."
                                        inputClassName="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20"
                                    />
                                </div>
                            )}

                            {/* NCM */}
                            {activeParentPendencies.some(p => p.type === 'ncm') && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider flex items-center gap-1">
                                        <i className="bi bi-exclamation-circle"></i> NCM
                                    </label>
                                    <input
                                        type="text"
                                        value={ncm}
                                        onChange={(e) => {
                                            setNcm(e.target.value);
                                            setHasChanges(true);
                                        }}
                                        placeholder="Ex: 9403.50.00"
                                        className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20"
                                    />
                                </div>
                            )}

                            {/* Preço de Venda */}
                            {activeParentPendencies.some(p => p.type === 'price') && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider flex items-center gap-1">
                                        <i className="bi bi-exclamation-circle"></i> Preço de Venda
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={price}
                                            onChange={(e) => {
                                                setPrice(e.target.value);
                                                setHasChanges(true);
                                            }}
                                            placeholder="0,00"
                                            className="w-full h-10 pl-9 pr-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
                                        />
                                    </div>
                                    {variations.length > 0 && (
                                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                                            💡 Definir aqui aplicará às {variations.length} variações sincronizadas.
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bloco de Herança de Atributos Compartilhados */}
                        {sharedAttributePendencies.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/30 space-y-2">
                                {sharedAttributePendencies.map(shared => (
                                    <div key={shared.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                {shared.attributeName}
                                            </p>
                                            <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                                                ✨ Definir aqui resolverá {shared.resolvesVariationsCount} variações.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="w-44">
                                                <VariationAttributeValueInput
                                                    attributeId={shared.attributeId}
                                                    attributeName={shared.attributeName}
                                                    value=""
                                                    registeredValues={[]}
                                                    dataType={shared.attributeDataType}
                                                    unit={shared.attributeUnit}
                                                    onChange={(val) => handleApplySharedAttribute(shared.attributeName!, val)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. SEÇÃO VARIAÇÕES (Exibida SOMENTE se houver variações e pendências) */}
                {isExpanded && variations.length > 0 && (
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                                Variações do Produto ({variations.length})
                            </span>
                        </div>

                        <div className="space-y-2">
                            {variations.map((v, vIdx) => {
                                const varPendencies = activeVariationPendencies.filter(p => p.variationId === v.id);
                                const isVariationValid = varPendencies.length === 0;

                                return (
                                    <div
                                        key={v.id || vIdx}
                                        className={`rounded-2xl border p-3 transition-all ${
                                            isVariationValid
                                                ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                                    {v.name || `Variação #${vIdx + 1}`}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {v.sku}
                                                </span>
                                            </div>

                                            {isVariationValid ? (
                                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <i className="bi bi-check2"></i> Válida
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                    <i className="bi bi-exclamation-triangle"></i> {varPendencies.length} pendente(s)
                                                </span>
                                            )}
                                        </div>

                                        {/* Apenas exibe inputs para campos pendentes da variação */}
                                        {!isVariationValid && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                {varPendencies.map(pend => {
                                                    if (pend.type === 'category_attribute' || pend.type === 'incomplete_attribute') {
                                                        const currentAttr = (v.attributes || []).find(
                                                            a => a.name.toLowerCase().trim() === (pend.attributeName || '').toLowerCase().trim()
                                                        );

                                                        return (
                                                            <div key={pend.id} className="flex flex-col gap-1">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                                    <i className="bi bi-asterisk text-purple-500 text-[8px]"></i>
                                                                    {pend.attributeName || pend.label}
                                                                </label>
                                                                <VariationAttributeValueInput
                                                                    attributeId={pend.attributeId}
                                                                    attributeName={pend.attributeName}
                                                                    value={currentAttr?.value || ''}
                                                                    registeredValues={[]}
                                                                    dataType={pend.attributeDataType || 'list'}
                                                                    unit={pend.attributeUnit}
                                                                    onChange={(val) => handleUpdateVariationAttribute(v.id, pend.attributeName || pend.label, val)}
                                                                />
                                                            </div>
                                                        );
                                                    }

                                                    if (pend.type === 'variation_price') {
                                                        return (
                                                            <div key={pend.id} className="flex flex-col gap-1">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                                    Preço da Variação
                                                                </label>
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={v.price || ''}
                                                                        onChange={(e) => {
                                                                            const val = Number(e.target.value);
                                                                            setVariations(prev => prev.map(item => item.id === v.id ? { ...item, price: val } : item));
                                                                            setHasChanges(true);
                                                                        }}
                                                                        placeholder="0,00"
                                                                        className="w-full h-8 pl-8 pr-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return null;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
