import React, { useState, useEffect, useMemo, useRef } from 'react';
import Product, { Variation } from '../../../../types/product.type';
import { aiService } from '@/pages/utils/aiService';
import { toast } from 'react-toastify';
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { 
    TechnicalFieldDefinition, 
    getApplicableTechnicalFields, 
    getAvailableAdditionalFields,
    getEffectiveTechnicalValue,
    hasVariationOverride,
    setVariationOverride,
    removeVariationOverride
    , groupTechnicalFields
} from '@/pages/utils/technicalValuesService';
import { TechnicalFieldInput } from '../tabs/TechnicalFieldInput';

interface VariationTechnicalTabProps {
    readonly formData: Variation;
    readonly setFormData?: React.Dispatch<React.SetStateAction<Variation | null>>;
    readonly parentProduct: Product;
    readonly handleChange: <K extends keyof Variation>(field: K, value: Variation[K]) => void;
}

export const VariationTechnicalTab: React.FC<VariationTechnicalTabProps> = ({
    formData,
    parentProduct,
    handleChange
}) => {
    const [isImprovingDescription, setIsImprovingDescription] = useState(false);
    const [allTechnicalFields, setAllTechnicalFields] = useState<TechnicalFieldDefinition[]>([]);
    const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [addSearchTerm, setAddSearchTerm] = useState('');
    const addDropdownRef = useRef<HTMLDivElement | null>(null);

    // Fechar dropdown de adicionar campo ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(event.target as Node)) {
                setIsAddMenuOpen(false);
                setAddSearchTerm('');
            }
        };

        if (isAddMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAddMenuOpen]);

    // Carregar Informações Técnicas cadastradas e vínculos
    useEffect(() => {
        let isMounted = true;

        const loadFields = async () => {
            setLoadingFields(true);
            try {
                const { data: attrData, error: attrErr } = await supabase
                    .from('attributes')
                    .select('id, name, active, data_type, is_globally_required, is_custom')
                    .eq('active', true)
                    .order('name');
                if (attrErr) throw attrErr;

                const { data: valData } = await supabase
                    .from('attribute_values')
                    .select('id, attribute_id, value');

                const { data: catAttrData, error: catAttrErr } = await supabase
                    .from('category_attributes')
                    .select('attribute_id, category_id, is_required');
                if (catAttrErr) {
                    console.warn('Aviso ao buscar category_attributes na variação:', catAttrErr);
                }

                if (!isMounted) return;

                const mapped: TechnicalFieldDefinition[] = (attrData || []).map((attr: any) => {
                    const opts = (valData || [])
                        .filter((v: any) => v.attribute_id === attr.id)
                        .map((v: any) => ({ id: v.id, value: v.value }))
                        .sort((a: any, b: any) => a.value.localeCompare(b.value, 'pt-BR', { numeric: true, sensitivity: 'base' }));

                    const linkedCategoryIds = (catAttrErr ? [] : (catAttrData || []))
                        .filter((ca: any) => ca.attribute_id === attr.id)
                        .map((ca: any) => ca.category_id);

                    return {
                        id: attr.id,
                        name: attr.name,
                        dataType: attr.data_type || 'list',
                        unit: '',
                        isRequired: Boolean(attr.is_globally_required),
                        isCustom: Boolean(attr.is_custom),
                        options: opts,
                        categoryIds: linkedCategoryIds
                    };
                });

                setAllTechnicalFields(mapped);
            } catch (err) {
                console.error('Erro ao carregar Características na variação:', err);
            } finally {
                if (isMounted) setLoadingFields(false);
            }
        };

        loadFields();

        return () => {
            isMounted = false;
        };
    }, []);

    // Atributos definidos na própria variação (ex: Cor, Material, Tamanho vindos do cadastro de variação)
    // Mapeados de forma normalizada para garantir match case-insensitive com o nome dos campos técnicos
    const variationAttributeValues = useMemo(() => {
        const map: Record<string, any> = {};
        (formData?.attributes || []).forEach(attr => {
            if (attr.name && attr.value) {
                map[attr.name] = attr.value;
                map[attr.name.trim().toLowerCase()] = attr.value;
            }
        });
        return map;
    }, [formData?.attributes]);

    // Campos visíveis na variação: categorias do pai + valores do pai + overrides da variação + atributos da variação + manuais
    const combinedValues = useMemo(() => {
        return {
            ...(parentProduct?.technicalValues || {}),
            ...variationAttributeValues,
            ...(formData?.technicalValues || {})
        };
    }, [parentProduct?.technicalValues, variationAttributeValues, formData?.technicalValues]);

    // Todas as especificações técnicas ativas cadastradas aparecem na variação
    const visibleFields = allTechnicalFields;
    const fieldGroups = groupTechnicalFields(visibleFields);

    const availableAdditionalFields: TechnicalFieldDefinition[] = [];

    const filteredAdditionalFields = useMemo(() => {
        const term = addSearchTerm.trim().toLowerCase();
        if (!term) return availableAdditionalFields;
        return availableAdditionalFields.filter(f => f.name.toLowerCase().includes(term));
    }, [availableAdditionalFields, addSearchTerm]);

    const handleSetOverride = (fieldName: string, value: any) => {
        const currentOverrides = formData.technicalValues || {};
        const updated = setVariationOverride(currentOverrides, fieldName, value);
        handleChange('technicalValues', updated);

        // Manter sincronizado com formData.attributes para retrocompatibilidade
        const currentAttrs = [...(formData.attributes || [])];
        const lowerName = fieldName.trim().toLowerCase();
        const existingIdx = currentAttrs.findIndex(a => a.name?.trim().toLowerCase() === lowerName);
        if (value) {
            if (existingIdx >= 0) {
                currentAttrs[existingIdx] = { ...currentAttrs[existingIdx], value: String(value) };
            } else {
                currentAttrs.push({ name: fieldName, value: String(value), showName: true });
            }
            handleChange('attributes', currentAttrs);
        } else if (existingIdx >= 0) {
            currentAttrs.splice(existingIdx, 1);
            handleChange('attributes', currentAttrs);
        }
    };

    const handleRemoveOverride = (fieldName: string) => {
        const currentOverrides = formData.technicalValues || {};
        const updated = removeVariationOverride(currentOverrides, fieldName);
        handleChange('technicalValues', updated);

        // Ao remover override e voltar a herdar, limpa também atributo correspondente se existir
        const currentAttrs = (formData.attributes || []).filter(
            a => a.name?.trim().toLowerCase() !== fieldName.trim().toLowerCase()
        );
        handleChange('attributes', currentAttrs);
    };

    const handleAddManualField = (field: TechnicalFieldDefinition) => {
        setManualFieldNames(prev => Array.from(new Set([...prev, field.name])));
        handleSetOverride(field.name, '');
        setIsAddMenuOpen(false);
        setAddSearchTerm('');
    };

    const handleRemoveManualField = (fieldName: string) => {
        setManualFieldNames(prev => prev.filter(name => name !== fieldName));
        handleRemoveOverride(fieldName);
    };

    const handleImproveDescriptionWithAI = async () => {
        const title = (formData.name || parentProduct.name || parentProduct.description || '').trim();
        setIsImprovingDescription(true);
        const mergedTechnicalValues = {
            ...(parentProduct.technicalValues || {}),
            ...(formData.technicalValues || {})
        };

        try {
            const result = await aiService.improveProductDescription({
                currentDescription: formData.description || '',
                title,
                material: formData.material || parentProduct.material,
                brand: parentProduct.brand,
                line: parentProduct.line,
                width: formData.syncWidth ? parentProduct.width : formData.width,
                height: formData.syncHeight ? parentProduct.height : formData.height,
                depth: formData.syncDepth ? parentProduct.depth : formData.depth,
                weight: formData.syncWeight ? parentProduct.weight : formData.weight,
                technicalValues: mergedTechnicalValues
            });

            handleChange('description', result.improvedDescription);
            toast.success('Descrição da variação aperfeiçoada com sucesso! ✨');
        } catch (error: unknown) {
            console.error(error);
            const msg = error instanceof Error ? error.message : 'Erro ao aperfeiçoar descrição com IA.';
            toast.error(msg);
        } finally {
            setIsImprovingDescription(false);
        }
    };


    return (
        <div className="space-y-6 animate-in fade-in duration-350">
            {/* Características da Variação */}
            <div className="flex flex-col gap-4">

                {loadingFields ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-bold animate-pulse">
                        <i className="bi bi-arrow-clockwise animate-spin mr-2" />
                        Carregando especificações técnicas...
                    </div>
                ) : visibleFields.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        Nenhuma Especificação Técnica cadastrada.
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 pt-1">
                        {fieldGroups.map(group => (
                            <section key={group.title} aria-labelledby={`variation-technical-group-${group.title}`} className="flex flex-col gap-3">
                                <h4 id={`variation-technical-group-${group.title}`} className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    {group.title}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {group.fields.map(field => {
                            const fieldLower = field.name.trim().toLowerCase();
                            const hasExplicitOverride = hasVariationOverride(formData.technicalValues, field.name);
                            const hasAttributeValue = variationAttributeValues[field.name] !== undefined || variationAttributeValues[fieldLower] !== undefined;
                            const isOverridden = hasExplicitOverride || hasAttributeValue;
                            
                            const rawEffectiveVal = getEffectiveTechnicalValue(
                                parentProduct?.technicalValues || {},
                                { ...variationAttributeValues, ...(formData.technicalValues || {}) },
                                field.name
                            );
                            const effectiveVal = rawEffectiveVal !== undefined 
                                ? rawEffectiveVal 
                                : variationAttributeValues[fieldLower];
                            const isManual = manualFieldNames.includes(field.name);
                            // Campo está "ativo" se tem override próprio OU se o pai informou valor
                            const parentVal = parentProduct?.technicalValues?.[field.name];
                            const isEnabled = isOverridden || (parentVal !== undefined && parentVal !== null && String(parentVal).trim() !== '');

                                        return (
                                <div key={field.id} className="flex flex-col gap-1.5 p-1 transition-all min-w-0">
                                    <div className="flex items-center justify-between gap-2 min-w-0">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 truncate min-w-0" title={field.name}>
                                            {field.name}
                                            {field.isRequired && <span className="ml-1 text-red-500" aria-label="Obrigatório">*</span>}
                                        </label>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Ícone sync: verde=sincronizado (corrente ligada), cinza=manual (corrente quebrada) */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isOverridden) {
                                                        handleRemoveOverride(field.name);
                                                    } else {
                                                        handleSetOverride(field.name, effectiveVal ?? '');
                                                    }
                                                }}
                                                className={`p-1 rounded-lg flex items-center transition-all cursor-pointer ${
                                                    isOverridden
                                                        ? 'text-slate-400 hover:text-slate-600'
                                                        : 'text-emerald-500 hover:text-emerald-600'
                                                }`}
                                                title={isOverridden ? "Manual — clique para sincronizar com o pai" : "Sincronizado com o pai — clique para personalizar"}
                                            >
                                                <i className={`bi ${isOverridden ? 'bi-link-45deg' : 'bi-link'} text-sm`} />
                                            </button>

                                            {isManual && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveManualField(field.name)}
                                                    title={`Remover campo ${field.name}`}
                                                    className="text-slate-400 hover:text-red-500 text-xs p-0.5"
                                                >
                                                    <i className="bi bi-trash3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <TechnicalFieldInput
                                        field={field}
                                        value={effectiveVal !== undefined && effectiveVal !== null ? effectiveVal : ''}
                                        disabled={!isOverridden && isEnabled}
                                        onChange={(selectedVal) => handleSetOverride(field.name, selectedVal)}
                                    />
                                </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {/* Descrição */}
            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                        Descrição da Variação
                    </h4>
                    <div className="flex items-center gap-2">
                        {!formData.syncDescription && (
                            <button
                                type="button"
                                onClick={handleImproveDescriptionWithAI}
                                disabled={isImprovingDescription}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-955/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/70 text-amber-600 dark:text-amber-400 font-black uppercase text-[9px] tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                            >
                                {isImprovingDescription ? (
                                    <>
                                        <i className="bi bi-arrow-repeat animate-spin text-amber-500" />
                                        Aperfeiçoando...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-stars text-amber-500 text-xs font-bold" />
                                        Aperfeiçoar com IA
                                    </>
                                )}
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={() => handleChange('syncDescription', !formData.syncDescription)}
                            className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${formData.syncDescription ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-850'}`}
                            title={formData.syncDescription ? "Desvincular Descrição do Pai" : "Sincronizar Descrição com o Pai"}
                        >
                            <i className={`bi ${formData.syncDescription ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'}`}></i>
                            <span className="text-[9px] font-black uppercase">{formData.syncDescription ? 'Sincronizado' : 'Manual'}</span>
                        </button>
                    </div>
                </div>
                {formData.syncDescription ? (
                    <div className="w-full mt-2 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs font-semibold text-slate-500 min-h-[80px]">
                        <span className="whitespace-pre-wrap">{parentProduct?.description || ''}</span>
                    </div>
                ) : (
                    <textarea
                        rows={4}
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Descrição específica desta variação (se vazia, sincroniza com o pai no e-commerce)..."
                        className="w-full mt-2 p-4 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all resize-none dark:text-slate-100"
                    />
                )}
            </div>
        </div>
    );
};
