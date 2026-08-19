import React from 'react';
import { Product } from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';

interface ProductGeneralTabProps {
    onOpenCategorySearch: () => void;
    suppliers: any[];
    isService: boolean;
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    availableCategories: any[];
    handleGenerateComboName: () => void;
    isGeneratingComboName: boolean;
    validationErrors?: Record<string, boolean>;
    setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
    onOpenCategorySearch,
    isService,
    formData,
    setFormData,
    availableCategories,
    validationErrors = {},
    setValidationErrors
}) => {
    const [availableMaterials, setAvailableMaterials] = React.useState<{id: string, name: string}[]>([]);
    const [opportunities, setOpportunities] = React.useState<{id: string, name: string}[]>([]);
    const [diferenciarTitulo, setDiferenciarTitulo] = React.useState<boolean>(
        Boolean(formData.title && formData.title !== formData.name) || Boolean(formData.marketplaceTitle && formData.marketplaceTitle !== formData.name)
    );

    const fetchMaterials = async () => {
        const { data } = await supabase.from('product_materials').select('*').order('name');
        if (data) setAvailableMaterials(data);
    };

    const fetchOpportunities = async () => {
        const { data } = await supabase.from('opportunities').select('id, name').eq('active', true).order('name');
        if (data) setOpportunities(data);
    };

    React.useEffect(() => {
        fetchMaterials();
        fetchOpportunities();
        
        const onFocus = () => {
            fetchMaterials();
            fetchOpportunities();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

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
                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5">
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
                            {diferenciarTitulo ? 'Usando Título Diferente' : 'Diferenciar Título Catálogo'}
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
                            if ((formData.name || '').trim() && setValidationErrors) {
                                setValidationErrors(prev => {
                                    const next = { ...prev };
                                    delete next.name;
                                    return next;
                                });
                            }
                        }}
                        className={`w-full px-4 py-2.5 bg-white dark:bg-slate-955 border rounded-xl outline-none text-xs font-bold dark:text-slate-100 shadow-sm transition-all font-mono ${
                            validationErrors?.name 
                                ? 'border-red-500 focus:ring-4 focus:ring-red-500/10 text-red-600' 
                                : 'border-slate-200 dark:border-slate-800 text-slate-800 focus:ring-4 focus:ring-blue-500/10'
                        }`}
                        placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..."
                    />
                </div>

                {/* Catalog / Ecommerce Title Section (Exibido apenas se diferenciarTitulo for true) */}
                {diferenciarTitulo ? (
                    <div id="field-marketplace-title" className="flex flex-col gap-1.5 transition-all p-2 rounded-2xl animate-in slide-in-from-right-2 duration-200">
                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
                            <span>Título no Catálogo</span>
                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
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
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                            placeholder="Digite o título no catálogo..."
                        />
                    </div>
                ) : (
                    <div className="hidden sm:block p-2"></div>
                )}
            </div>

            {/* Selection Row */}
            {!isService && (
                <div id="field-product-categories" className="md:col-span-2 flex flex-col gap-4 transition-all p-2 rounded-2xl">
                    <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between h-6">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <span>Categoria(s)</span>
                                    <span className="text-red-500 ml-0.5">*</span>
                                    <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
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
                                >
                                    <i className="bi bi-gear-fill text-xs"></i>
                                </button>
                            </div>
                        </div>
                        <div className={`max-h-80 min-h-[200px] overflow-y-auto py-1 space-y-0.5 custom-scrollbar w-full border-2 rounded-2xl p-2 transition-all ${
                            validationErrors?.categoryIds 
                                ? 'border-red-500 bg-red-50/10 dark:bg-red-950/5' 
                                : 'border-transparent'
                        }`}>
                            {availableCategories
                                .filter(cat => {
                                    const FIXED_ENVIRONMENTS = ["SALA DE JANTAR", "SALA DE ESTAR", "COZINHA", "QUARTO", "LAVANDERIA", "BANHEIRO", "LAVANDEIRA", "ESCRITORIO", "ESCRITÓRIO", "VARANDA", "ÁREA GOURMET", "GARAGEM"];
                                    const name = cat.name?.trim().toUpperCase();
                                    const isFixed = FIXED_ENVIRONMENTS.includes(name);
                                    const hasChildren = availableCategories.some(other => other.parents?.includes(cat.id));
                                    const isEnvironment = isFixed || (hasChildren && (!cat.parents || cat.parents.length === 0)) || (!cat.parents || cat.parents.length === 0);
                                    return !isEnvironment;
                                })
                                .map((cat) => {
                                    const isChecked = (formData.categoryIds || []).includes(cat.id);
                                    
                                    const parentNames = (cat.parents || [])
                                        .map((pid: string) => availableCategories.find(item => item.id === pid)?.name)
                                        .filter(Boolean)
                                        .join(', ');

                                    return (
                                        <label
                                            key={cat.id}
                                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer select-none"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    if (checked && setValidationErrors) {
                                                        setValidationErrors(prev => {
                                                            const next = { ...prev };
                                                            delete next.categoryIds;
                                                            return next;
                                                        });
                                                    }
                                                    setFormData(prev => {
                                                        const ids = prev.categoryIds || [];
                                                        let nextIds;
                                                        if (checked) {
                                                            nextIds = [...ids, cat.id];
                                                        } else {
                                                            nextIds = ids.filter(id => id !== cat.id);
                                                        }
                                                        
                                                        const next = { ...prev, categoryIds: nextIds };
                                                        
                                                        const getAllRoots = (catIds: string[]): string[] => {
                                                            const roots = new Set<string>();
                                                            const visited = new Set<string>();
                                                            const find = (catId: string) => {
                                                                    if (visited.has(catId)) return;
                                                                    visited.add(catId);
                                                                    const c = availableCategories.find(item => item.id === catId);
                                                                    if (!c) return;
                                                                    if (!c.parents || c.parents.length === 0) {
                                                                        roots.add(c.name);
                                                                    } else {
                                                                        c.parents.forEach((pid: string) => find(pid));
                                                                    }
                                                            };
                                                            catIds.forEach(find);
                                                            return Array.from(roots);
                                                        };

                                                        const allEnvs = getAllRoots(nextIds);
                                                        let detectedEnv = prev.environment;
                                                        if (!detectedEnv || !allEnvs.includes(detectedEnv)) {
                                                            detectedEnv = allEnvs[0] || '';
                                                        }
                                                        next.environment = detectedEnv;
                                                        next.availableEnvironments = allEnvs;
                                                        return next;
                                                    });
                                                }}
                                                className="mt-1 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                                                {parentNames && (
                                                    <span className="text-[10px] text-slate-400">
                                                        Ambientes: {parentNames}
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* Oportunidade */}
            <div className="md:col-span-2">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
                        <span>Oportunidade</span>
                        <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                    </label>
                    <select
                        value={formData.opportunityId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, opportunityId: e.target.value || null }))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                        className="w-full h-24 px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 resize-none focus:ring-4 focus:ring-blue-500/10"
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductGeneralTab;
