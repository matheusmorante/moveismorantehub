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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Identification Section */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-sm">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                            ID do Produto <span className="text-slate-400 font-normal">(Auto ou Manual)</span>
                        </label>
                        <i className="bi bi-fingerprint text-slate-300"></i>
                    </div>
                    <input
                        value={formData.id || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                        disabled={!!formData.id && formData.id.length > 15} // Disable if it's already a UUID (safety)
                        className="w-full px-5 py-3 bg-slate-50/50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold text-slate-600 dark:text-slate-400 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                        placeholder="Gerado automaticamente..."
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                            SKU / Código Comercial <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                const newCode = generateProductCode(formData.description || '', formData.productTypeName, formData.line);
                                setFormData(prev => ({ ...prev, code: newCode }));
                                toast.info(`Novo prefixo gerado: ${newCode}`);
                            }}
                            className="text-[9px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <i className="bi bi-magic"></i> Gerar Novo
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            value={formData.code || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            className="w-full px-5 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold text-blue-600 dark:text-blue-400 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                            placeholder="EX: REF-123, 489..."
                        />
                        <i className="bi bi-barcode absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    </div>
                </div>
            </div>

            {/* Title Section */}
            <div className="md:col-span-2 bg-slate-50/30 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                        Título do Produto (Manual) <span className="text-red-500">*</span>
                    </label>
                    {formData.isCombo && (
                        <button
                            type="button"
                            onClick={handleGenerateComboName}
                            disabled={isGeneratingComboName}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all shadow-sm"
                        >
                            {isGeneratingComboName ? (
                                <span className="flex items-center gap-1"><i className="bi bi-hourglass-split animate-spin"></i> Gerando...</span>
                            ) : (
                                <span className="flex items-center gap-1"><i className="bi bi-magic"></i> Sugerir com IA</span>
                            )}
                        </button>
                    )}
                </div>
                
                <input
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value.toUpperCase() }))}
                    className="w-full px-6 py-5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl outline-none text-xl font-black text-slate-800 dark:text-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                    placeholder="Digite o título do produto..."
                />
            </div>

            {/* Selection Row */}
            {!isService && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-6 gap-6">
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categorias <span className="text-red-500">*</span></label>
                        </div>
                        <CategoryAutocomplete
                            filter="categories"
                            selectedIds={formData.categoryIds || []}
                            onSelect={(cat) => {
                                setFormData(prev => {
                                    const ids = prev.categoryIds || [];
                                    if (ids.includes(cat.id)) return prev;
                                    
                                    let nextIds = [...ids, cat.id];
                                    const next = { ...prev, categoryIds: nextIds };
                                    
                                    // Auto-detect environments (root categories) for ALL selected Categories
                                    const getAllRoots = (ids: string[]): string[] => {
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
                                        ids.forEach(find);
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

                            onRemove={(id) => {
                                setFormData(prev => {
                                    const nextIds = prev.categoryIds?.filter(i => i !== id) || [];
                                    const next = { ...prev, categoryIds: nextIds };
                                    
                                    // Recalcular todos os ambientes disponíveis das categorias restantes
                                    const getAllRoots = (ids: string[]): string[] => {
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
                                        ids.forEach(find);
                                        return Array.from(roots);
                                    };

                                    const allEnvs = getAllRoots(nextIds);
                                    next.availableEnvironments = allEnvs;
                                    
                                    if (allEnvs.length > 0 && (!next.environment || !allEnvs.includes(next.environment))) {
                                        next.environment = allEnvs[0];
                                    } else if (allEnvs.length === 0) {
                                        next.environment = '';
                                    }

                                    return next;
                                });
                            }}
                            onSearch={onOpenCategorySearch}
                        />
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Linha / Modelo {!formData.hasNoLine && <span className="text-red-500">*</span>}
                            </label>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, hasNoLine: !prev.hasNoLine, line: !prev.hasNoLine ? '' : prev.line }))}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${formData.hasNoLine ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                <i className={`bi ${formData.hasNoLine ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i> {formData.hasNoLine ? 'Informar Linha' : 'Não Contém'}
                            </button>
                        </div>
                        {formData.hasNoLine ? (
                            <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-400 italic">NÃO INFORMADO</div>
                        ) : (
                            <SmartInput
                                value={formData.line || ""}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, line: val.toUpperCase() }))}
                                tableName="products"
                                columnName="line"
                                placeholder="EX: JK, POP, COPA"
                                icon="bi-layout-text-window-reverse"
                            />
                        )}
                    </div>

                    <div className="flex flex-col gap-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Marca {!formData.noBrand && <span className="text-red-500">*</span>}
                            </label>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, noBrand: !prev.noBrand, brand: !prev.noBrand ? '' : prev.brand }))}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${formData.noBrand ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                <i className={`bi ${formData.noBrand ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i> {formData.noBrand ? 'Informar' : 'Não Contém'}
                            </button>
                        </div>
                        {formData.noBrand ? (
                            <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-400 italic">NÃO INFORMADO</div>
                        ) : (
                            <SmartInput
                                value={formData.brand || ""}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, brand: val.toUpperCase() }))}
                                tableName="products"
                                columnName="brand"
                                placeholder="Marca"
                                icon="bi-award"
                                required
                            />
                        )}
                    </div>


                </div>
            )}

            <div className="grid grid-cols-2 gap-6 md:col-span-2">


                {/* Condition */}
                {formData.itemType === 'product' && (
                    <div className="flex flex-col gap-2 md:col-span-2 mt-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Condição do Produto <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                            {[
                                { value: 'novo', label: 'Novo', icon: 'bi-box-seam' },
                                { value: 'usado', label: 'Usado', icon: 'bi-recycle' },
                                { value: 'salvado', label: 'Salvado (Avariado)', icon: 'bi-exclamation-triangle' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, condition: opt.value as any }))}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-sm transition-all ${formData.condition === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                                >
                                    <i className={`bi ${opt.icon}`}></i> {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Price */}
            <div className="flex flex-col gap-2 md:col-span-2">
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
                            <i className="bi bi-calculator"></i> Somar Itens do Combo
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
                    className="w-full px-4 py-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-black text-blue-600 dark:text-blue-400"
                />
            </div>

            {formData.itemType === 'product' && (
                <div className="md:col-span-2 mt-4 bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <i className="bi bi-rulers text-blue-600"></i> Detalhes Técnicos / Dimensões
                        </h4>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Essas informações enriquecem a descrição gerada pela IA</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Material */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material do Produto</label>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {availableMaterials.map(mat => (
                                    <button
                                        key={mat.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, material: mat.name.toUpperCase() })}
                                        className={"px-3 py-2 rounded-xl text-[10px] font-bold border transition-all " + (formData.material === mat.name.toUpperCase() ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-blue-300')}
                                    >
                                        {mat.name}
                                    </button>
                                ))}
                                {availableMaterials.length === 0 && (
                                    <p className="text-[9px] text-slate-400 font-bold uppercase italic">Nenhum material cadastrado.</p>
                                )}
                            </div>
                            <input
                                value={formData.material || ''}
                                onChange={(e) => setFormData({ ...formData, material: e.target.value.toUpperCase() })}
                                placeholder="Material (Auto-detectado ou Manual)..."
                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold uppercase"
                            />
                        </div>



                        {/* Dimensions */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dimensões Totais (cm)</label>
                                {formData.width && formData.height && formData.depth && (
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg uppercase tracking-tighter">
                                        Peso Cubado: {calculateDIM(formData.height, formData.width, formData.depth).toFixed(2)}kg
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {/* Largura */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Largura</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, noWidth: !prev.noWidth, width: !prev.noWidth ? 0 : prev.width }))}
                                            className={`p-1 rounded-md transition-all ${formData.noWidth ? 'text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}
                                            title={formData.noWidth ? 'Ocultar' : 'Mostrar'}
                                        >
                                            <i className={`bi ${formData.noWidth ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                                        </button>
                                    </div>
                                    {!formData.noWidth ? (
                                        <input
                                            type="number"
                                            value={(!formData.width || isNaN(formData.width as number)) ? '' : formData.width}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({ ...formData, width: isNaN(val) ? 0 : val });
                                            }}
                                            placeholder="L"
                                            className="w-full px-3 py-3 rounded-xl text-xs font-bold text-center border bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    ) : (
                                        <div className="w-full px-3 py-3 rounded-xl text-[9px] font-black text-center bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase tracking-tighter">Oculto</div>
                                    )}
                                </div>

                                {/* Altura */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Altura</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, noHeight: !prev.noHeight, height: !prev.noHeight ? 0 : prev.height }))}
                                            className={`p-1 rounded-md transition-all ${formData.noHeight ? 'text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}
                                            title={formData.noHeight ? 'Ocultar' : 'Mostrar'}
                                        >
                                            <i className={`bi ${formData.noHeight ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                                        </button>
                                    </div>
                                    {!formData.noHeight ? (
                                        <input
                                            type="number"
                                            value={(!formData.height || isNaN(formData.height as number)) ? '' : formData.height}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({ ...formData, height: isNaN(val) ? 0 : val });
                                            }}
                                            placeholder="A"
                                            className="w-full px-3 py-3 rounded-xl text-xs font-bold text-center border bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    ) : (
                                        <div className="w-full px-3 py-3 rounded-xl text-[9px] font-black text-center bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase tracking-tighter">Oculto</div>
                                    )}
                                </div>

                                {/* Profundidade */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Profund.</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, noDepth: !prev.noDepth, depth: !prev.noDepth ? 0 : prev.depth }))}
                                            className={`p-1 rounded-md transition-all ${formData.noDepth ? 'text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-slate-500'}`}
                                            title={formData.noDepth ? 'Ocultar' : 'Mostrar'}
                                        >
                                            <i className={`bi ${formData.noDepth ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                                        </button>
                                    </div>
                                    {!formData.noDepth ? (
                                        <input
                                            type="number"
                                            value={(!formData.depth || isNaN(formData.depth as number)) ? '' : formData.depth}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setFormData({ ...formData, depth: isNaN(val) ? 0 : val });
                                            }}
                                            placeholder="P"
                                            className="w-full px-3 py-3 rounded-xl text-xs font-bold text-center border bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                    ) : (
                                        <div className="w-full px-3 py-3 rounded-xl text-[9px] font-black text-center bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase tracking-tighter">Oculto</div>
                                    )}
                                </div>
                            </div>



                            {/* LTL Alert */}
                            {(() => {
                                const ltl = checkLTLRequirement({
                                    height: formData.height,
                                    width: formData.width,
                                    depth: formData.depth,
                                    weight: formData.weight
                                });
                                if (ltl.required) {
                                    return (
                                        <div className="mt-2 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:orange-800 rounded-2xl animate-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <i className="bi bi-truck text-orange-600"></i>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Alerta de Carga Pesada (LTL)</span>
                                            </div>
                                            <ul className="text-[9px] font-bold text-orange-700/70 dark:text-orange-400 list-disc list-inside">
                                                {ltl.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                            </ul>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Extra Dimensions */}
                        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medições Adicionais (Máx. 10)</label>
                                    <p className="text-[9px] text-slate-400 italic">Ex: "Altura até o assento", "80cm"</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = formData.extraDimensions || [];
                                        if (current.length < 10) {
                                            setFormData({ ...formData, extraDimensions: [...current, { label: '', value: '' }] });
                                        }
                                    }}
                                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-xl hover:bg-blue-100 transition-all"
                                >
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.extraDimensions?.map((dim, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            value={dim.label || ''}
                                            onChange={(e) => {
                                                const next = [...(formData.extraDimensions || [])];
                                                next[idx].label = e.target.value;
                                                setFormData({ ...formData, extraDimensions: next });
                                            }}
                                            placeholder="Label"
                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                                        />
                                        <input
                                            value={dim.value || ''}
                                            onChange={(e) => {
                                                const next = [...(formData.extraDimensions || [])];
                                                next[idx].value = e.target.value;
                                                setFormData({ ...formData, extraDimensions: next });
                                            }}
                                            placeholder="Valor"
                                            className="w-24 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = formData.extraDimensions?.filter((_, i) => i !== idx);
                                                setFormData({ ...formData, extraDimensions: next });
                                            }}
                                            className="text-red-400 hover:text-red-600 p-1"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Observations */}
            <div className="md:col-span-2">
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Observações Internas (Não visível no marketplace)
                    </label>
                    <textarea
                        value={formData.observations || ''}
                        onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                        placeholder="Digite notas internas sobre este produto, processos ou detalhes específicos..."
                        className="w-full h-32 px-4 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-medium dark:text-slate-200 resize-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductGeneralTab;
