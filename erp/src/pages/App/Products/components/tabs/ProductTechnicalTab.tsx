import React, { useEffect, useState, useRef } from 'react';
import { Product } from '../../../../types/product.type';
import { syncVariationsWithParent } from '../../utils/variationParentSync';
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { 
    TechnicalFieldDefinition, 
    getApplicableTechnicalFields, 
    getAvailableAdditionalFields 
    , groupTechnicalFields
} from '@/pages/utils/technicalValuesService';
import { TechnicalFieldInput } from './TechnicalFieldInput';

interface ProductTechnicalTabProps {
    readonly formData: Partial<Product>;
    readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    readonly handleImproveDescriptionWithAI?: () => void;
    readonly isImprovingDescription?: boolean;
    readonly validationErrors?: Record<string, boolean>;
}

const ProductTechnicalTab: React.FC<ProductTechnicalTabProps> = ({
    formData,
    setFormData,
    handleImproveDescriptionWithAI,
    isImprovingDescription,
    validationErrors
}) => {
    const [allTechnicalFields, setAllTechnicalFields] = useState<TechnicalFieldDefinition[]>([]);
    const [manualFieldNames, setManualFieldNames] = useState<string[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [addSearchTerm, setAddSearchTerm] = useState('');
    const addDropdownRef = useRef<HTMLDivElement | null>(null);

    // Campos clássicos que as variações podem herdar do pai
    const SYNCED_FIELDS = new Set<keyof Product>(['description', 'width', 'height', 'depth', 'weight']);

    const handleFieldChange = <K extends keyof Product>(field: K, value: Product[K]) => {
        setFormData(prev => {
            const next: Partial<Product> = { ...prev, [field]: value };
            if (SYNCED_FIELDS.has(field) && next.variations?.length) {
                next.variations = syncVariationsWithParent(next.variations, {
                    description: next.description,
                    width: next.width,
                    height: next.height,
                    depth: next.depth,
                    weight: next.weight,
                });
            }
            return next;
        });
    };

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

    // Carregar Informações Técnicas cadastradas e seus vínculos de categoria
    useEffect(() => {
        let isMounted = true;

        const loadFields = async () => {
            setLoadingFields(true);
            try {
                // 1. Buscar todos os atributos (campos técnicos)
                let { data: attrData, error: attrErr } = await supabase
                    .from('attributes')
                    .select('id, name, active, data_type, unit, is_globally_required, is_custom')
                    .eq('active', true)
                    .order('name');
                if (attrErr && (attrErr.message?.includes('is_custom') || attrErr.code === '42703')) {
                    const fallback = await supabase
                        .from('attributes')
                        .select('id, name, active, data_type, unit, is_globally_required')
                        .eq('active', true)
                        .order('name');
                    attrData = fallback.data;
                    attrErr = fallback.error;
                }
                if (attrErr) throw attrErr;

                // 2. Buscar valores/opções cadastrados
                const { data: valData } = await supabase
                    .from('attribute_values')
                    .select('id, attribute_id, value');

                // 3. Buscar vínculos com categorias
                const { data: catAttrData, error: catAttrErr } = await supabase
                    .from('category_attributes')
                    .select('attribute_id, category_id, is_required');
                if (catAttrErr) {
                    console.warn('Aviso ao buscar category_attributes:', catAttrErr);
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
                        unit: attr.unit || (['altura', 'largura', 'profundidade'].includes(String(attr.name).toLocaleLowerCase('pt-BR')) ? 'cm' : String(attr.name).toLocaleLowerCase('pt-BR') === 'peso' ? 'kg' : undefined),
                        isRequired: false,
                        isCustom: Boolean(attr.is_custom),
                        options: opts,
                        categoryIds: linkedCategoryIds
                    };
                });

                setAllTechnicalFields(mapped);
                setFormData(prev => {
                    const technicalValues = { ...(prev.technicalValues || {}) };
                    let changed = false;
                    mapped.filter(field => field.isRequired).forEach(field => {
                        if (!Object.prototype.hasOwnProperty.call(technicalValues, field.name)) {
                            technicalValues[field.name] = '';
                            changed = true;
                        }
                    });
                    return changed ? { ...prev, technicalValues } : prev;
                });
            } catch (err) {
                console.error('Erro ao carregar Características:', err);
            } finally {
                if (isMounted) setLoadingFields(false);
            }
        };

        loadFields();

        return () => {
            isMounted = false;
        };
    }, []);

    // Só exibe características globais ou vinculadas às categorias selecionadas.
    const visibleFields = getApplicableTechnicalFields(
        allTechnicalFields,
        formData.categoryIds || [],
        formData.technicalValues || {},
        manualFieldNames
    );
    const fieldGroups = groupTechnicalFields(visibleFields);

    const availableAdditionalFields = getAvailableAdditionalFields(allTechnicalFields, visibleFields);

    // Filtrar campos adicionais por busca
    const filteredAdditionalFields = React.useMemo(() => {
        const term = addSearchTerm.trim().toLowerCase();
        if (!term) return availableAdditionalFields;
        return availableAdditionalFields.filter(f => f.name.toLowerCase().includes(term));
    }, [availableAdditionalFields, addSearchTerm]);

    const handleTechnicalValueChange = (fieldName: string, value: any) => {
        setFormData(prev => {
            const currentTech = { ...(prev.technicalValues || {}) };
            const isRequiredField = allTechnicalFields.some(field => field.name === fieldName && field.isRequired);
            if (value === undefined || value === null || (value === '' && !isRequiredField)) {
                delete currentTech[fieldName];
            } else {
                currentTech[fieldName] = value;
            }
            return {
                ...prev,
                technicalValues: currentTech
            };
        });
    };

    const handleAddManualField = (field: TechnicalFieldDefinition) => {
        setManualFieldNames(prev => Array.from(new Set([...prev, field.name])));
        handleTechnicalValueChange(field.name, '');
        setIsAddMenuOpen(false);
        setAddSearchTerm('');
    };

    const handleRemoveManualField = (fieldName: string) => {
        setManualFieldNames(prev => prev.filter(name => name !== fieldName));
        handleTechnicalValueChange(fieldName, undefined);
    };

    const hasCategory = (formData.categoryIds || []).length > 0;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Características */}
            <div className="flex flex-col gap-4">

                {loadingFields ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold animate-pulse">
                        <i className="bi bi-arrow-clockwise animate-spin mr-2" />
                        Carregando especificações técnicas...
                    </div>
                ) : visibleFields.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
                        <i className="bi bi-info-circle text-lg text-slate-400" />
                        <span>Nenhuma especificação técnica cadastrada no sistema.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 pt-2">
                        {fieldGroups.map(group => (
                            <section key={group.title} aria-labelledby={`technical-group-${group.title}`} className="flex flex-col gap-3">
                                <h4 id={`technical-group-${group.title}`} className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    {group.title}
                                </h4>
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,280px))] gap-x-5 gap-y-4">
                                    {group.fields.map((field) => {
                            const rawValue = formData.technicalValues?.[field.name];
                            const hasSelectedValue = rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '';
                            const isManual = manualFieldNames.includes(field.name);
                            const isNotApplicable = rawValue === 'Não se aplica';
                            const isAlwaysApplicable = ['cor', 'material da estrutura'].includes(field.name.trim().toLocaleLowerCase('pt-BR'));
                            const isApplicable = isAlwaysApplicable || !isNotApplicable;
                            const isFieldInvalid = isApplicable && !hasSelectedValue && validationErrors?.technicalValues;

                                        return (
                                <div key={field.id} id={`technical-field-${field.name}`} className="flex w-[280px] max-w-full flex-col gap-1.5 p-1 transition-all">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-1.5 transition-colors ${
                                            isFieldInvalid 
                                                ? 'text-red-600 dark:text-red-400' 
                                                : isNotApplicable
                                                ? 'text-slate-400 dark:text-slate-500'
                                                : 'text-slate-600 dark:text-slate-300'
                                        }`}>
                                            <span>{field.name}{field.unit ? ` (${field.unit})` : ''}</span>
                                            {field.isRequired && isApplicable && <span className="text-red-500" aria-label="Obrigatório">*</span>}
                                            {isManual && (
                                                <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1 py-0.2 rounded border border-blue-200/50">
                                                    Manual
                                                </span>
                                            )}
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            {/* Switch Toggle: Ligado = Se aplica (padrão) | Desligado = Não se aplica */}
                                            { !['cor', 'material da estrutura'].includes(field.name.trim().toLocaleLowerCase('pt-BR')) && <button
                                                type="button"
                                                role="switch"
                                                aria-checked={isApplicable}
                                                onClick={() => {
                                                    if (field.name.trim().toLocaleLowerCase('pt-BR') === 'cor') return;
                                                    // Se estava aplicável, ao desligar vira 'Não se aplica'
                                                    // Se estava desligado ('Não se aplica'), ao ligar volta a ser vazio/editável
                                                    handleTechnicalValueChange(field.name, isApplicable ? 'Não se aplica' : '');
                                                }}
                                                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    isApplicable
                                                        ? 'bg-blue-600 dark:bg-blue-500'
                                                        : 'bg-slate-300 dark:bg-slate-700'
                                                }`}
                                                disabled={field.name.trim().toLocaleLowerCase('pt-BR') === 'cor'}
                                                title={field.name.trim().toLocaleLowerCase('pt-BR') === 'cor' ? 'Cor é obrigatória' : 'Se aplica?'}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                        isApplicable ? 'translate-x-3' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button> }

                                            {isManual && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveManualField(field.name)}
                                                    title={`Remover ${field.name}`}
                                                    aria-label={`Remover campo ${field.name}`}
                                                    className="text-slate-400 hover:text-red-500 p-0.5 text-xs transition-colors ml-1"
                                                >
                                                    <i className="bi bi-trash3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <TechnicalFieldInput
                                        field={field}
                                        value={rawValue !== undefined && rawValue !== null ? rawValue : ''}
                                        isInvalid={Boolean(isFieldInvalid)}
                                        disabled={!isAlwaysApplicable && (rawValue === 'Não se aplica' || rawValue === 'N/A')}
                                        onChange={(selectedVal) => handleTechnicalValueChange(field.name, selectedVal)}
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

        </div>
    );
};

export default ProductTechnicalTab;
