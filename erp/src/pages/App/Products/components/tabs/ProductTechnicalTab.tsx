import React, { useEffect, useState, useRef } from 'react';
import { Product } from '../../../../types/product.type';
import { syncVariationsWithParent } from '../../utils/variationParentSync';
import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { 
    TechnicalFieldDefinition, 
    getApplicableTechnicalFields, 
    getAvailableAdditionalFields 
} from '@/pages/utils/technicalValuesService';
import { TechnicalCombobox } from './TechnicalCombobox';

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
                const { data: attrData, error: attrErr } = await supabase
                    .from('attributes')
                    .select('id, name, active, is_globally_required')
                    .eq('active', true)
                    .order('name');
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
                        dataType: 'list',
                        unit: '',
                        isRequired: Boolean(attr.is_globally_required),
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
                console.error('Erro ao carregar Especificações Técnicas:', err);
            } finally {
                if (isMounted) setLoadingFields(false);
            }
        };

        loadFields();

        return () => {
            isMounted = false;
        };
    }, []);

    // Campos visíveis: categorias do produto + campos já preenchidos + adicionados manualmente
    const visibleFields = React.useMemo(() => {
        return getApplicableTechnicalFields(
            allTechnicalFields,
            formData.categoryIds || [],
            formData.technicalValues || {},
            manualFieldNames
        );
    }, [allTechnicalFields, formData.categoryIds, formData.technicalValues, manualFieldNames]);

    // Campos disponíveis para adicionar manualmente
    const availableAdditionalFields = React.useMemo(() => {
        return getAvailableAdditionalFields(allTechnicalFields, visibleFields);
    }, [allTechnicalFields, visibleFields]);

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
            {/* Especificações Técnicas */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all">

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <i className="bi bi-cpu text-blue-600" aria-hidden="true"></i>
                            Especificações Técnicas do Produto
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Campos sugeridos conforme a categoria e especificações adicionais do produto.
                        </p>
                    </div>

                    {/* Botão + Adicionar Especificação Técnica com Dropdown */}
                    <div className="relative" ref={addDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsAddMenuOpen(prev => !prev)}
                            disabled={loadingFields || !hasCategory || availableAdditionalFields.length === 0}
                            title={!hasCategory ? "Selecione uma categoria primeiro" : undefined}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-sm"
                        >
                            <i className="bi bi-plus-lg text-sm font-bold" />
                            <span>Adicionar Especificação Técnica</span>
                            {hasCategory && availableAdditionalFields.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-blue-200/70 dark:bg-blue-800/70 font-black">
                                    {availableAdditionalFields.length}
                                </span>
                            )}
                        </button>

                        {isAddMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="relative flex items-center">
                                        <i className="bi bi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            autoFocus
                                            value={addSearchTerm}
                                            onChange={(e) => setAddSearchTerm(e.target.value)}
                                            placeholder="Buscar campo adicional..."
                                            className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                                        />
                                    </div>
                                </div>

                                <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                    {filteredAdditionalFields.length === 0 ? (
                                        <div className="py-4 text-center text-slate-400 text-xs italic">
                                            Nenhum campo disponível encontrado.
                                        </div>
                                    ) : (
                                        filteredAdditionalFields.map(field => (
                                            <button
                                                key={field.id}
                                                type="button"
                                                onClick={() => handleAddManualField(field)}
                                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors flex items-center justify-between group"
                                            >
                                                <span className="truncate">{field.name}</span>
                                                <i className="bi bi-plus-circle text-slate-300 group-hover:text-blue-500 transition-colors" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {loadingFields ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold animate-pulse">
                        <i className="bi bi-arrow-clockwise animate-spin mr-2" />
                        Carregando especificações técnicas...
                    </div>
                ) : !hasCategory && visibleFields.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
                        <i className="bi bi-lock-fill text-lg text-slate-400" />
                        <span className="font-bold text-slate-600 dark:text-slate-300">Nenhuma categoria selecionada.</span>
                        <span className="text-[11px] text-slate-500">
                            Selecione uma categoria para ver as especificações da categoria. As obrigatórias globais aparecem em qualquer produto.
                        </span>
                    </div>
                ) : visibleFields.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
                        <i className="bi bi-info-circle text-lg text-slate-400" />
                        <span>Nenhuma especificação técnica configurada para a categoria selecionada.</span>
                        <span className="text-[11px] text-slate-500">
                            Clique em <strong>+ Adicionar Especificação Técnica</strong> acima para incluir campos manualmente.
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 pt-2">
                        {visibleFields.map((field) => {
                            const rawValue = formData.technicalValues?.[field.name];
                            const hasSelectedValue = rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '';
                            const isManual = manualFieldNames.includes(field.name);
                            const isFieldInvalid = field.isRequired && !hasSelectedValue && validationErrors?.technicalValues;

                            return (
                                <div key={field.id} id={`technical-field-${field.name}`} className="flex flex-col gap-1.5 p-1 transition-all">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest truncate flex items-center gap-1.5 transition-colors ${
                                            isFieldInvalid 
                                                ? 'text-red-600 dark:text-red-400' 
                                                : 'text-slate-600 dark:text-slate-300'
                                        }`}>
                                            <span>{field.name}</span>
                                            {field.isRequired && <span className="text-red-500" aria-label="Obrigatório">*</span>}
                                            {isManual && (
                                                <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1 py-0.2 rounded border border-blue-200/50">
                                                    Manual
                                                </span>
                                            )}
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            {isManual && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveManualField(field.name)}
                                                    title={`Remover ${field.name}`}
                                                    aria-label={`Remover campo ${field.name}`}
                                                    className="text-slate-400 hover:text-red-500 p-0.5 text-xs transition-colors"
                                                >
                                                    <i className="bi bi-trash3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <TechnicalCombobox
                                        fieldName={field.name}
                                        value={rawValue !== undefined && rawValue !== null ? String(rawValue) : ''}
                                        placeholder={field.isRequired ? `Selecione ${field.name}...` : 'Não informado'}
                                        options={field.options}
                                        isInvalid={Boolean(isFieldInvalid)}
                                        onChange={(selectedVal) => {
                                            handleTechnicalValueChange(field.name, selectedVal);
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Descrição Detalhada - Altura dobrada */}
            <div className="flex flex-col gap-2 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-file-text text-blue-600" aria-hidden="true"></i> Descrição Detalhada
                    </h4>
                    {handleImproveDescriptionWithAI && (
                        <button
                            type="button"
                            onClick={handleImproveDescriptionWithAI}
                            disabled={isImprovingDescription}
                            aria-label="Aperfeiçoar descrição com inteligência artificial"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/70 text-amber-600 dark:text-amber-400 font-black uppercase text-[9px] tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                        >
                            {isImprovingDescription ? (
                                <>
                                    <i className="bi bi-arrow-repeat animate-spin text-amber-500" aria-hidden="true" />
                                    Aperfeiçoando...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-stars text-amber-500 text-xs font-bold" aria-hidden="true" />
                                    Aperfeiçoar
                                </>
                            )}
                        </button>
                    )}
                </div>
                <textarea
                    rows={12}
                    aria-label="Descrição detalhada do produto"
                    value={formData.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Escreva a descrição detalhada do produto, diferenciais, especificações técnicas..."
                    className="w-full mt-2 p-3 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 resize-y dark:text-slate-200 transition-all min-h-[220px]"
                />
            </div>

            {/* Dimensões Físicas e Peso */}
            <div id="field-product-dimensions" className="flex flex-col gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-ruler text-blue-600" aria-hidden="true"></i> Medidas e Peso
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="product-height-input" className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Altura (cm)
                        </label>
                        <input
                            id="product-height-input"
                            type="number"
                            step="0.1"
                            aria-label="Altura em centímetros"
                            value={formData.height || ''}
                            onChange={(e) => handleFieldChange('height', parseFloat(e.target.value) || 0)}
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="product-width-input" className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Largura (cm)
                        </label>
                        <input
                            id="product-width-input"
                            type="number"
                            step="0.1"
                            aria-label="Largura em centímetros"
                            value={formData.width || ''}
                            onChange={(e) => handleFieldChange('width', parseFloat(e.target.value) || 0)}
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="product-depth-input" className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span>{formData.depthUseLength ? 'Comprimento (cm)' : 'Profundidade (cm)'}</span>
                                <button
                                    type="button"
                                    onClick={() => handleFieldChange('depthUseLength', !formData.depthUseLength)}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-all border border-slate-200 dark:border-slate-700 hover:border-blue-300 cursor-pointer"
                                    title={formData.depthUseLength ? 'Usar Profundidade' : 'Usar Comprimento'}
                                    aria-label={formData.depthUseLength ? 'Alternar para Profundidade' : 'Alternar para Comprimento'}
                                >
                                    <i className="bi bi-arrow-left-right text-[9px]" aria-hidden="true" />
                                    {formData.depthUseLength ? 'Prof.' : 'Comp.'}
                                </button>
                            </div>
                        </label>
                        <input
                            id="product-depth-input"
                            type="number"
                            step="0.1"
                            aria-label={formData.depthUseLength ? 'Comprimento em centímetros' : 'Profundidade em centímetros'}
                            value={formData.depth || ''}
                            onChange={(e) => handleFieldChange('depth', parseFloat(e.target.value) || 0)}
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="product-weight-input" className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Peso (kg)
                        </label>
                        <input
                            id="product-weight-input"
                            type="number"
                            step="0.01"
                            aria-label="Peso em quilogramas"
                            value={formData.weight || ''}
                            onChange={(e) => handleFieldChange('weight', parseFloat(e.target.value) || 0)}
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                            placeholder="0,00"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTechnicalTab;
