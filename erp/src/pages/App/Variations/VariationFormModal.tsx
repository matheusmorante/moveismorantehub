import React, { useState, useEffect } from "react";
import VariationType, { VariationOption, AttributeDataType } from "../../types/variation.type";
import { saveVariation, checkVariationUsage } from "../../utils/variationService";
import { fetchCategories, Category } from "../../utils/categoryService";
import { toast } from "react-toastify";

interface VariationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    variation?: VariationType | null;
    allVariations?: VariationType[];
}

const DATA_TYPES: Array<{ value: AttributeDataType; label: string }> = [
    { value: 'list', label: 'Seleção Única / Lista de Opções' },
    { value: 'text', label: 'Texto Livre' },
    { value: 'integer', label: 'Número Inteiro' },
    { value: 'decimal', label: 'Número Decimal' },
    { value: 'boolean', label: 'Booleano (Sim / Não)' },
    { value: 'measure', label: 'Medida com Unidade' }
];

const VariationFormModal = ({ isOpen, onClose, onSuccess, variation }: VariationFormModalProps) => {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    
    const initialFormData: Partial<VariationType> = {
        name: "",
        options: [],
        active: true,
        dataType: 'list',
        unit: '',
        isGloballyRequired: false,
        categoryAttributes: []
    };

    const [formData, setFormData] = useState<Partial<VariationType>>(initialFormData);
    const [newOptionValue, setNewOptionValue] = useState("");
    const [isGlobal, setIsGlobal] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchCategories().then(setCategories).catch(console.error);
        }
    }, [isOpen]);

    useEffect(() => {
        if (variation) {
            setFormData({
                ...variation,
                dataType: variation.dataType || 'list',
                unit: variation.unit || '',
                isGloballyRequired: variation.isGloballyRequired ?? false,
                categoryAttributes: variation.categoryAttributes || []
            });
            setIsGlobal(!variation.categoryAttributes || variation.categoryAttributes.length === 0);
        } else {
            setFormData(initialFormData);
            setIsGlobal(true);
        }
        setNewOptionValue("");
    }, [variation, isOpen]);

    const addOption = () => {
        if (!newOptionValue.trim()) return;
        const newOpt: VariationOption = {
            id: Math.random().toString(36).substr(2, 9),
            value: newOptionValue.trim()
        };
        setFormData(prev => ({
            ...prev,
            options: [...(prev.options || []), newOpt]
        }));
        setNewOptionValue("");
    };

    const removeOption = async (id: string, value: string) => {
        if (variation?.id) {
            setLoading(true);
            const isInUse = await checkVariationUsage(formData.name!, value);
            setLoading(false);
            if (isInUse) {
                toast.warning(`O valor "${value}" não pode ser removido pois está vinculado a produtos.`);
                return;
            }
        }
        setFormData(prev => ({
            ...prev,
            options: prev.options?.filter(o => o.id !== id)
        }));
    };

    const updateOption = (id: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options?.map(o => o.id === id ? { ...o, value } : o)
        }));
    };

    const toggleCategory = (categoryId: string) => {
        const currentCats = formData.categoryAttributes || [];
        const exists = currentCats.find(c => c.categoryId === categoryId);

        if (exists) {
            setFormData(prev => ({
                ...prev,
                categoryAttributes: (prev?.categoryAttributes || []).filter(c => c.categoryId !== categoryId)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                categoryAttributes: [...(prev?.categoryAttributes || []), { categoryId, isRequired: false }]
            }));
        }
    };

    const toggleRequiredCategory = (categoryId: string) => {
        setFormData(prev => ({
            ...prev,
            categoryAttributes: (prev?.categoryAttributes || []).map(c => 
                c.categoryId === categoryId ? { ...c, isRequired: !c.isRequired } : c
            )
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name?.trim()) {
            toast.error("O nome da Especificação Técnica é obrigatório (Ex: Cor, Quantidade de portas).");
            return;
        }

        const effectiveDataType = formData.dataType || 'list';
        if (effectiveDataType === 'list' && (!formData.options || formData.options.length === 0)) {
            toast.error("Para campos do tipo Seleção Única / Lista, cadastre pelo menos uma opção possível.");
            return;
        }

        setLoading(true);
        try {
            if (variation?.active && !formData.active) {
                const isInUse = await checkVariationUsage(formData.name);
                if (isInUse) {
                    toast.warning(`A Especificação Técnica "${formData.name}" não pode ser inativada pois está vinculada a produtos.`);
                    setFormData(prev => ({ ...prev, active: true }));
                    setLoading(false);
                    return;
                }
            }

            const payload: VariationType = {
                id: variation?.id,
                name: formData.name.trim(),
                options: effectiveDataType === 'list' ? (formData.options || []) : [],
                active: formData.active ?? true,
                dataType: effectiveDataType,
                unit: formData.unit?.trim() || undefined,
                isGloballyRequired: formData.isGloballyRequired ?? false,
                categoryAttributes: isGlobal ? [] : (formData.categoryAttributes || [])
            };

            await saveVariation(payload);
            toast.success(variation ? "Especificação Técnica atualizada!" : "Especificação Técnica criada com sucesso!");
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar Especificação Técnica.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isListType = (formData.dataType || 'list') === 'list';
    const isMeasureType = formData.dataType === 'measure' || formData.dataType === 'integer' || formData.dataType === 'decimal';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        {variation ? "Editar Especificação Técnica" : "Nova Especificação Técnica"}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-6 sm:p-8">
                    <div className="flex flex-col gap-6">
                        {/* Nome da Especificação Técnica */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Nome da Especificação Técnica
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                placeholder="Ex: Tipo de porta, Cor, Material..."
                            />
                        </div>

                        <label className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(formData.isGloballyRequired)}
                                onChange={(event) => setFormData(prev => ({ ...prev, isGloballyRequired: event.target.checked }))}
                                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                            />
                            <span>
                                <span className="block text-xs font-black text-amber-900 dark:text-amber-200">Obrigatória em todos os produtos</span>
                                <span className="block mt-0.5 text-[11px] font-medium leading-relaxed text-amber-800/80 dark:text-amber-100/70">Exibe esta especificação em todas as categorias e exige um valor ao salvar o produto.</span>
                            </span>
                        </label>

                        {/* Valores Possíveis (Opções) */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Valores Possíveis (Opções)
                            </label>
                            
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newOptionValue}
                                    onChange={(e) => setNewOptionValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addOption();
                                        }
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                    placeholder="Adicionar novo valor (Ex: Bater + Correr, Branco...)"
                                />
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors cursor-pointer shrink-0"
                                >
                                    Adicionar
                                </button>
                            </div>

                            <div className="flex flex-col gap-2 mt-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                                {(!formData.options || formData.options.length === 0) && (
                                    <p className="text-xs text-slate-400 text-center py-6 italic">Nenhum valor cadastrado ainda.</p>
                                )}
                                {formData.options?.map((opt, idx) => (
                                    <div key={opt.id} className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                                            {idx + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={opt.value}
                                            onChange={(e) => updateOption(opt.id, e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeOption(opt.id, opt.value)}
                                            className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:hover:bg-red-500 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                        >
                                            <i className="bi bi-trash text-xs"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Adicionar automaticamente nas categorias */}
                        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <i className="bi bi-magic text-blue-600" />
                                        <span>Adicionar automaticamente nas categorias</span>
                                    </label>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                        Quando um produto de uma dessas categorias for cadastrado, este campo aparecerá sugerido automaticamente.
                                    </p>
                                </div>
                            </div>

                            {/* Categorias Selecionadas (Chips) */}
                            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                                {(!formData.categoryAttributes || formData.categoryAttributes.length === 0) ? (
                                    <span className="text-xs text-slate-400 italic py-1 px-2">
                                        Nenhuma categoria vinculada (campo disponível apenas para adição manual nos produtos).
                                    </span>
                                ) : (
                                    formData.categoryAttributes.map(ca => {
                                        const cat = categories.find(c => c.id === ca.categoryId);
                                        const catName = cat?.name || 'Categoria';
                                        return (
                                            <span 
                                                key={ca.categoryId}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 animate-in fade-in"
                                            >
                                                <span>{catName}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCategory(ca.categoryId)}
                                                    aria-label={`Remover categoria ${catName}`}
                                                    className="hover:text-red-500 transition-colors cursor-pointer"
                                                >
                                                    <i className="bi bi-x-circle-fill text-[11px]" />
                                                </button>
                                            </span>
                                        );
                                    })
                                )}
                            </div>

                            {/* Seletor com Busca para Adicionar Categoria */}
                            <CategoryAutocompletePicker
                                categories={categories}
                                selectedIds={new Set((formData.categoryAttributes || []).map(ca => ca.categoryId))}
                                onSelectCategory={(catId) => toggleCategory(catId)}
                            />
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none transition-all flex items-center gap-2 cursor-pointer"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <i className="bi bi-check-lg" />
                        )}
                        {variation ? "Salvar Alterações" : "Criar Campo"}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface CategoryAutocompletePickerProps {
    readonly categories: readonly Category[];
    readonly selectedIds: ReadonlySet<string>;
    readonly onSelectCategory: (categoryId: string) => void;
}

const CategoryAutocompletePicker: React.FC<CategoryAutocompletePickerProps> = ({
    categories,
    selectedIds,
    onSelectCategory
}) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const availableCategories = React.useMemo(() => {
        const term = search.trim().toLowerCase();
        return categories
            .filter(c => !selectedIds.has(c.id))
            .filter(c => !term || c.name.toLowerCase().includes(term))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    }, [categories, selectedIds, search]);

    return (
        <div ref={containerRef} className="relative">
            <div className="relative flex items-center">
                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    placeholder="Buscar categoria para adicionar automaticamente..."
                    className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                        <i className="bi bi-x-circle-fill" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                    {availableCategories.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-xs">
                            {search ? `Nenhuma categoria encontrada para "${search}"` : 'Todas as categorias já foram adicionadas'}
                        </div>
                    ) : (
                        <div className="p-1 space-y-0.5">
                            {availableCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onSelectCategory(cat.id);
                                        setSearch('');
                                    }}
                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                                >
                                    <span>{cat.name}</span>
                                    <i className="bi bi-plus-circle text-blue-600 dark:text-blue-400 text-xs" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VariationFormModal;
