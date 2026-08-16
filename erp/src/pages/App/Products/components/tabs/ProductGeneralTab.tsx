import React from 'react';
import { Product } from '@/pages/types/product.type';
import SmartInput from '@/components/SmartInput';
import { calculateDIM, checkLTLRequirement } from '../../../../utils/calculations';
import CategoryAutocomplete from '../../../../../components/CategoryAutocomplete';
import { toast } from 'react-toastify';
import { generateProductCode } from '../../../../utils/formatters';
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
    suppliers,
    isService,
    formData,
    setFormData,
    availableCategories,
    handleGenerateComboName,
    isGeneratingComboName
}) => {

    const [availableMaterials, setAvailableMaterials] = React.useState<{id: string, name: string}[]>([]);

    const fetchMaterials = async () => {
        const { data } = await supabase.from('product_materials').select('*').order('name');
        if (data) setAvailableMaterials(data);
    };

    React.useEffect(() => {
        fetchMaterials();
        
        // Refresh materials when window regains focus (e.g. after adding one in settings tab)
        const onFocus = () => fetchMaterials();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    // [NOVO] Sincronizar campo CORES baseado nas variações
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

            {/* Title Section */}
            <div className="md:col-span-2 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                        Nome do Produto (Interno / Fiscal) <span className="text-red-500">*</span>
                    </label>
                </div>
                
                <input
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none text-base font-black text-slate-800 dark:text-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                    placeholder="Digite o nome interno/fiscal do produto..."
                />
            </div>

            {/* Ecommerce Title Section */}
            <div className="md:col-span-2 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                        Título do Produto (E-commerce)
                    </label>
                </div>
                
                <input
                    value={formData.marketplaceTitle || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, marketplaceTitle: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none text-base font-black text-slate-800 dark:text-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                    placeholder="Digite o título que aparecerá no e-commerce..."
                />
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5 md:col-span-1 max-w-xs">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Preço de Venda (R$)</label>
                    {formData.isCombo && (
                        <button
                            type="button"
                            onClick={() => {
                                const total = formData.comboItems?.reduce((acc: number, item) => acc + ((item.unitPrice || 0) * item.quantity), 0) || 0;
                                setFormData({ ...formData, unitPrice: Number(total.toFixed(2)) });
                                toast.info(`Preço calculado: R$ ${total.toFixed(2)}`);
                            }}
                            className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                        >
                            <i className="bi bi-calculator"></i> Somar
                        </button>
                    )}
                </div>
                <input
                    type="number"
                    step="0.01"
                    value={(formData.unitPrice === null || formData.unitPrice === undefined || isNaN(formData.unitPrice as number)) ? '' : formData.unitPrice}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({ ...formData, unitPrice: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-black text-blue-600 dark:text-blue-400"
                />
            </div>

            {/* Selection Row */}
            {!isService && (
                <div className="md:col-span-2 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoria(s) <span className="text-red-500">*</span></label>
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
                                    // Filtra para remover categorias que são ambientes principais baseados na lógica anterior
                                    const FIXED_ENVIRONMENTS = ["SALA DE JANTAR", "SALA DE ESTAR", "COZINHA", "QUARTO", "LAVANDERIA", "BANHEIRO", "LAVANDEIRA", "ESCRITORIO", "ESCRITÓRIO", "VARANDA", "ÁREA GOURMET", "GARAGEM"];
                                    const name = cat.name?.trim().toUpperCase();
                                    const isFixed = FIXED_ENVIRONMENTS.includes(name);
                                    const hasChildren = availableCategories.some(other => other.parents?.includes(cat.id));
                                    const isEnvironment = isFixed || (hasChildren && (!cat.parents || cat.parents.length === 0)) || (!cat.parents || cat.parents.length === 0);
                                    return !isEnvironment;
                                })
                                .map((cat) => {
                                    const isChecked = (formData.categoryIds || []).includes(cat.id);
                                    
                                    // Descobrir nomes dos ambientes (pais)
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
                                                        
                                                        // Auto-detect environments (root categories)
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



            {/* Observations */}
            <div className="md:col-span-2">
                <div className="flex flex-col gap-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Observações Internas (Não visível no marketplace)
                    </label>
                    <textarea
                        value={formData.observations || ''}
                        onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                        placeholder="Digite notas internas sobre este produto, processos ou detalhes específicos..."
                        className="w-full h-24 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none text-xs font-medium dark:text-slate-200 resize-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductGeneralTab;
