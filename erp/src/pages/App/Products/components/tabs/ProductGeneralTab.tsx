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
}

const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
    onOpenCategorySearch,
    isService,
    formData,
    setFormData,
    availableCategories
}) => {
    const [availableMaterials, setAvailableMaterials] = React.useState<{id: string, name: string}[]>([]);
    const [opportunities, setOpportunities] = React.useState<{id: string, name: string}[]>([]);

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
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
                        <span>Nome</span>
                    </label>
                    <input
                        value={formData.name || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ 
                                ...prev, 
                                name: val 
                            }));
                        }}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                        placeholder="Digite o nome interno do produto (ex: SOFA 3 LUG)..."
                    />
                </div>

                {/* Catalog / Ecommerce Title Section */}
                <div id="field-marketplace-title" className="flex flex-col gap-1.5 transition-all p-2 rounded-2xl">
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-1.5 h-6">
                        <span>Título</span>
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
            </div>

            {/* Selection Row */}
            {!isService && (
                <div id="field-product-categories" className="md:col-span-2 flex flex-col gap-4 transition-all p-2 rounded-2xl">
                    <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between h-6">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <span>Categoria(s)</span>
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
                        <div className="max-h-80 min-h-[200px] overflow-y-auto py-1 space-y-0.5 custom-scrollbar w-full">
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
