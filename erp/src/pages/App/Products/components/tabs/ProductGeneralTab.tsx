import React from 'react';
import { Product } from '@/pages/types/product.type';
import { toTitleCase } from '@/pages/utils/textUtils';
import { useProductOpportunities } from '../../hooks/useProductOpportunities';
import {
    filterProductSelectableCategories,
    getProductCategoryRootNames,
    searchProductCategories,
    type ProductCategoryOption,
} from './productCategoryEnvironment';

interface ProductGeneralTabProps {
    readonly onOpenCategorySearch: () => void;
    readonly isService: boolean;
    readonly formData: Partial<Product>;
    readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    readonly availableCategories: readonly ProductCategoryOption[];
    readonly validationErrors?: Record<string, boolean>;
    readonly setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    readonly isGeneratingCategory?: boolean;
}

const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
    onOpenCategorySearch,
    isService,
    formData,
    setFormData,
    availableCategories,
    validationErrors = {},
    setValidationErrors,
    isGeneratingCategory = false
}) => {
    const { opportunities } = useProductOpportunities();

    const [diferenciarTitulo, setDiferenciarTitulo] = React.useState<boolean>(
        Boolean(formData.title && formData.title !== formData.name) || Boolean(formData.marketplaceTitle && formData.marketplaceTitle !== formData.name)
    );

    const [categorySearch, setCategorySearch] = React.useState<string>('');

    const selectableCategories = React.useMemo(
        () => filterProductSelectableCategories([...availableCategories]),
        [availableCategories]
    );

    const selectedCategories = React.useMemo(
        () => selectableCategories.filter(cat => (formData.categoryIds || []).includes(cat.id)),
        [selectableCategories, formData.categoryIds]
    );

    const suggestedCategories = React.useMemo(
        () => searchProductCategories(selectableCategories, [...availableCategories], categorySearch),
        [selectableCategories, availableCategories, categorySearch]
    );

    const handleToggleCategory = React.useCallback((catId: string, isChecked: boolean) => {
        if (isChecked && setValidationErrors) {
            setValidationErrors(prev => {
                const next = { ...prev };
                delete next.categoryIds;
                return next;
            });
        }
        setFormData(prev => {
            const ids = prev.categoryIds || [];
            const nextIds = isChecked
                ? [...ids, catId]
                : ids.filter(id => id !== catId);

            const next = { ...prev, categoryIds: nextIds };
            const allEnvs = getProductCategoryRootNames(nextIds, [...availableCategories]);
            let detectedEnv = prev.environment;
            if (!detectedEnv || !allEnvs.includes(detectedEnv)) {
                detectedEnv = allEnvs[0] || '';
            }
            next.environment = detectedEnv;
            next.availableEnvironments = allEnvs;
            return next;
        });
    }, [availableCategories, setFormData, setValidationErrors]);

    React.useEffect(() => {
        if (formData.hasVariations && formData.variations?.length) {
            const colorsSet = new Set<string>();
            formData.variations.forEach(v => {
                v.attributes?.forEach(attr => {
                    const attrName = attr.name?.toUpperCase() || '';
                    if (attrName === 'COR' && attr.value) {
                        colorsSet.add(attr.value.toUpperCase());
                    }
                });
            });

            const detectedColors = Array.from(colorsSet).join(' / ');
            if (detectedColors && detectedColors !== formData.colors) {
                setFormData(prev => ({ ...prev, colors: detectedColors, noColors: false }));
            }
        }
    }, [formData.variations, formData.hasVariations]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Title Section (Agrupados na mesma linha em 2 colunas) */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome do Produto (ERP) */}
                <div id="field-product-name" className="flex flex-col gap-1.5 transition-all p-2 rounded-2xl">
                    <div className="flex items-center justify-between h-6">
                        <label className={`text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 ${validationErrors?.name ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <span>Nome</span>
                            <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                const newValue = !diferenciarTitulo;
                                setDiferenciarTitulo(newValue);
                                if (!newValue) {
                                    setFormData(prev => ({
                                        ...prev,
                                        title: prev.name,
                                        marketplaceTitle: prev.name
                                    }));
                                }
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                                diferenciarTitulo 
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' 
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 hover:bg-slate-200'
                            }`}
                        >
                            {diferenciarTitulo ? 'Usando Título Diferente' : 'Diferenciar Título no Catálogo'}
                        </button>
                    </div>
                    <input
                        value={formData.name || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ 
                                ...prev, 
                                name: val,
                                ...(!diferenciarTitulo ? { title: val, marketplaceTitle: val } : {})
                            }));
                        }}
                        onBlur={() => {
                            if (formData.name) {
                                const formatted = toTitleCase(formData.name);
                                if (formatted !== formData.name) {
                                    setFormData(prev => ({
                                        ...prev,
                                        name: formatted,
                                        ...(!diferenciarTitulo ? { title: formatted, marketplaceTitle: formatted } : {})
                                    }));
                                }
                            }
                            if ((formData.name || '').trim() && setValidationErrors) {
                                setValidationErrors(prev => {
                                    const next = { ...prev };
                                    delete next.name;
                                    return next;
                                });
                            }
                        }}
                        className={`w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all font-mono ${
                            validationErrors?.name 
                                ? 'border-red-500 text-red-600 focus:border-red-600' 
                                : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400'
                        }`}
                        placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..."
                    />
                </div>

                {/* Catalog / Ecommerce Title Section (Exibido apenas se diferenciarTitulo for true) */}
                {diferenciarTitulo ? (
                    <div id="field-marketplace-title" className="flex flex-col gap-1.5 transition-all p-2 rounded-2xl animate-in slide-in-from-right-2 duration-200">
                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
                            <span>Título no Catálogo</span>
                        </label>
                        <input
                            value={formData.title || formData.marketplaceTitle || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({ 
                                    ...prev, 
                                    title: val, 
                                    marketplaceTitle: val 
                                }));
                            }}
                            onBlur={() => {
                                const currentVal = formData.title || formData.marketplaceTitle || '';
                                if (currentVal) {
                                    const formatted = toTitleCase(currentVal);
                                    if (formatted !== currentVal) {
                                        setFormData(prev => ({
                                            ...prev,
                                            title: formatted,
                                            marketplaceTitle: formatted
                                        }));
                                    }
                                }
                            }}
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400 transition-all font-mono"
                            placeholder="Digite o título no catálogo..."
                        />
                    </div>
                ) : null}
            </div>

            {/* Selection Row */}
            {!isService && (
                <div id="field-product-categories" className="md:col-span-2 flex flex-col gap-3 transition-all p-2 rounded-2xl">
                    <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center justify-between h-6">
                            <div className="flex items-center gap-2">
                                <label
                                    htmlFor="input-search-product-categories"
                                    className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${validationErrors?.categoryIds ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}
                                >
                                    <span>Categoria(s)</span>
                                    <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newWindow = window.open('/registrations/product-categories', '_blank');
                                        if (newWindow) {
                                            newWindow.blur();
                                            window.focus();
                                        }
                                    }}
                                    className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                                    title="Gerenciar Categorias"
                                    aria-label="Gerenciar Categorias de Produtos"
                                >
                                    <i className="bi bi-gear-fill text-xs" />
                                </button>
                                {isGeneratingCategory && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-955/80 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/80 dark:border-amber-700/80 animate-pulse select-none">
                                        <i className="bi bi-stars text-amber-500 animate-spin text-[10px]" />
                                        <span>IA analisando categoria...</span>
                                    </span>
                                )}
                            </div>

                            {selectedCategories.length > 0 && (
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                                    {selectedCategories.length} selecionada{selectedCategories.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className={`flex flex-wrap items-center gap-1.5 w-full px-1 py-2 border-b-2 transition-colors ${
                            validationErrors?.categoryIds && selectedCategories.length === 0
                                ? 'border-red-500 focus-within:border-red-600'
                                : 'border-slate-200 dark:border-slate-800 focus-within:border-blue-600 dark:focus-within:border-blue-400'
                        }`}>
                        {/* Categorias selecionadas dentro do campo de pesquisa */}
                        {selectedCategories.length > 0 && (
                            <div className="contents">
                                {selectedCategories.map((cat) => {
                                    const parentNames = (cat.parents || [])
                                        .map((pid: string) => availableCategories.find(item => item.id === pid)?.name)
                                        .filter(Boolean)
                                        .join(', ');

                                    return (
                                        <span
                                            key={cat.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-sm"
                                        >
                                            <i className="bi bi-check2 text-blue-600 dark:text-blue-400 font-bold" />
                                            <span>{cat.name}</span>
                                            {parentNames && (
                                                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                                    ({parentNames})
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleCategory(cat.id, false)}
                                                className="ml-1 text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded focus:outline-none"
                                                title={`Remover ${cat.name}`}
                                                aria-label={`Remover categoria ${cat.name}`}
                                            >
                                                <i className="bi bi-x text-sm leading-none" />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        {/* Campo de Pesquisa de Categorias */}
                        <div className="relative flex items-center flex-1 min-w-[180px]">
                            <i className="bi bi-search absolute left-3 text-slate-400 text-xs pointer-events-none" />
                            <input
                                id="input-search-product-categories"
                                type="text"
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                placeholder="Pesquisar categorias..."
                                aria-label="Pesquisar categorias"
                                className={`w-full pl-8 pr-8 py-0.5 text-xs font-semibold rounded-none bg-transparent border-0 outline-none focus:ring-0 transition-all ${
                                    validationErrors?.categoryIds && selectedCategories.length === 0
                                        ? 'text-red-600'
                                        : 'text-slate-800 dark:text-slate-100'
                                }`}
                            />
                            {categorySearch && (
                                <button
                                    type="button"
                                    onClick={() => setCategorySearch('')}
                                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                                    title="Limpar busca"
                                    aria-label="Limpar termo de busca"
                                >
                                    <i className="bi bi-x-circle-fill text-xs" />
                                </button>
                            )}
                        </div>

                        </div>

                        {/* Caixa de Sugestões e Resultados */}
                        {categorySearch.trim().length >= 2 && (
                        <div className={`overflow-y-auto custom-scrollbar w-full border rounded-xl p-2 transition-all ${
                            isGeneratingCategory
                                ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 ring-2 ring-amber-400/40 animate-pulse'
                                : validationErrors?.categoryIds && selectedCategories.length === 0
                                    ? 'border-red-500/80 bg-red-50/10 dark:bg-red-950/5'
                                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30'
                        }`}>
                            {suggestedCategories.length === 0 ? (
                                <div className="py-5 px-3 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-1">
                                    <i className="bi bi-inbox text-base opacity-40 mb-0.5" />
                                    <span>Nenhuma categoria encontrada para &ldquo;<strong className="text-slate-600 dark:text-slate-300">{categorySearch}</strong>&rdquo;.</span>
                                </div>
                            ) : (
                                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1">
                                        Sugestões encontradas ({suggestedCategories.length}):
                                    </div>
                                    {suggestedCategories.map((cat) => {
                                        const isChecked = (formData.categoryIds || []).includes(cat.id);
                                        const parentNames = (cat.parents || [])
                                            .map((pid: string) => availableCategories.find(item => item.id === pid)?.name)
                                            .filter(Boolean)
                                            .join(', ');

                                        return (
                                            <label
                                                key={cat.id}
                                                className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer select-none ${
                                                    isChecked
                                                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50'
                                                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border border-transparent'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        handleToggleCategory(cat.id, e.target.checked);
                                                        setCategorySearch('');
                                                    }}
                                                    className="mt-1 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className={`text-xs font-bold ${
                                                        isChecked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'
                                                    }`}>
                                                        {cat.name}
                                                    </span>
                                                    {parentNames && (
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                            Ambientes: {parentNames}
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>
            )}

            {/* Oportunidade */}
            <div className="md:col-span-2">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
                        <span>Oportunidade</span>
                    </label>
                    <select
                        value={formData.opportunityId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, opportunityId: e.target.value || null }))}
                        className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                    >
                        <option value="">Nenhuma (Produto Normal)</option>
                        {opportunities.map((opp) => (
                            <option key={opp.id} value={opp.id}>
                                {opp.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Observations */}
            <div className="md:col-span-2">
                <div className="flex flex-col gap-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 h-6">
                        <span>Observações Internas</span>
                    </label>
                    <textarea
                        value={formData.observations || ''}
                        onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                        placeholder="Digite notas internas sobre este produto, processos ou detalhes específicos..."
                        className="w-full h-24 px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200 resize-none focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductGeneralTab;
