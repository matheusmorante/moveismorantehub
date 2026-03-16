import React from 'react';
import Product from '../../../../types/product.type';
import SmartInput from '../../../../../components/SmartInput';
import { calculateDIM, checkLTLRequirement } from '../../../../utils/calculations';
import CategoryAutocomplete from '../../../../../components/CategoryAutocomplete';
import { toast } from 'react-toastify';
import { generateProductCode } from '../../../../utils/formatters';

interface ProductGeneralTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    availableCategories: any[];
    isGeneratingCategory: boolean;
    handleGenerateCategory: () => void;
    handleGenerateComboName: () => void;
    isGeneratingComboName: boolean;
    onOpenCategorySearch: () => void;
}

const ProductGeneralTab: React.FC<ProductGeneralTabProps> = ({
    formData,
    setFormData,
    availableCategories,
    isGeneratingCategory,
    handleGenerateCategory,
    handleGenerateComboName,
    isGeneratingComboName,
    onOpenCategorySearch
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Title */}
            <div className="md:col-span-2 relative group uppercase font-black">
                <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">
                        Título do Produto <span className="text-red-500">*</span>
                    </label>
                    {formData.isCombo && (
                        <button
                            type="button"
                            onClick={handleGenerateComboName}
                            disabled={isGeneratingComboName}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${isGeneratingComboName ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400'}`}
                            title="Gerar nome atraente com IA"
                        >
                            {isGeneratingComboName ? (
                                <span className="flex items-center gap-1"><i className="bi bi-hourglass-split animate-spin"></i> Gerando...</span>
                            ) : (
                                <span className="flex items-center gap-1"><i className="bi bi-magic"></i> Sugerir Nome com IA</span>
                            )}
                        </button>
                    )}
                </div>
                <input
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-700 dark:text-slate-200"
                    placeholder={formData.isCombo ? "Ex: JOGO DE JANTAR MODERNO 4 CADEIRAS" : "Ex: CAMISETA ALGODÃO EGÍPCIO PREMIUM"}
                />
            </div>

            <div className="grid grid-cols-2 gap-6 md:col-span-2">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Código (SKU Principal) <span className="text-red-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                if (!formData.description) return toast.warning("Digite o título para gerar o SKU");
                                const newCode = generateProductCode(formData.description);
                                setFormData({ ...formData, code: newCode });
                                toast.info(`SKU Sugerido: ${newCode}`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-all"
                            title="Regerar SKU baseado no título"
                        >
                            <i className="bi bi-magic"></i> Sugerir SKU
                        </button>
                    </div>
                    {formData.hasVariations ? (
                        <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl">
                            <i className="bi bi-info-circle-fill text-blue-600"></i>
                            <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-tight">
                                Este produto possui variações. O SKU é definido individualmente em cada variação na aba "Variações".
                            </p>
                        </div>
                    ) : (
                        <SmartInput
                            value={formData.code}
                            onValueChange={(val) => setFormData({ ...formData, code: val.toUpperCase() })}
                            tableName="products"
                            columnName="code"
                            placeholder="Ex: PROD-001"
                            icon="bi-upc-scan"
                        />
                    )}
                </div>
                <SmartInput
                    label="Unidade de Medida"
                    value={formData.unit || "UN"}
                    onValueChange={(val) => setFormData({ ...formData, unit: val.toUpperCase() })}
                    patterns={["UN", "KG", "M", "CX", "PC", "PAR", "L"]}
                    tableName="products"
                    columnName="unit"
                    placeholder="Ex: UN, KG, M..."
                    icon="bi-box-seam"
                />
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Marca / Fabricante <span className="text-red-500">*</span></label>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, noBrand: !prev.noBrand }))}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${formData.noBrand ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            <i className={`bi ${formData.noBrand ? 'bi-check-circle-fill' : 'bi-circle'}`}></i> {formData.noBrand ? 'Mostrar' : 'Ocultar'}
                        </button>
                    </div>
                    <SmartInput
                        value={formData.brand || ""}
                        onValueChange={(val) => setFormData({ ...formData, brand: val })}
                        tableName="products"
                        columnName="brand"
                        placeholder="Ex: Kappesberg, Henn..."
                        icon="bi-award"
                        required
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Categorias associadas <span className="text-red-500">*</span></label>
                        <button
                            type="button"
                            onClick={handleGenerateCategory}
                            disabled={isGeneratingCategory}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${isGeneratingCategory ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'}`}
                            title="Sugerir categorias com IA"
                        >
                            {isGeneratingCategory ? (
                                <span className="flex items-center gap-1"><i className="bi bi-hourglass-split animate-spin"></i> Analisando...</span>
                            ) : (
                                <span className="flex items-center gap-1"><i className="bi bi-magic"></i> Sugerir com IA</span>
                            )}
                        </button>
                    </div>
                    <CategoryAutocomplete
                        selectedIds={formData.categoryIds || []}
                        onSelect={(cat) => {
                            setFormData(prev => {
                                const ids = prev.categoryIds || [];
                                if (ids.includes(cat.id)) return prev;
                                
                                let nextIds = [...ids, cat.id];
                                if (cat.parent_id && !nextIds.includes(cat.parent_id)) {
                                    nextIds.push(cat.parent_id);
                                }
                                return { ...prev, categoryIds: nextIds };
                            });
                        }}
                        onRemove={(id) => {
                            setFormData(prev => ({
                                ...prev,
                                categoryIds: prev.categoryIds?.filter(i => i !== id)
                            }));
                        }}
                        onSearch={onOpenCategorySearch}
                    />
                </div>

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
                    value={isNaN(formData.unitPrice as number) ? '' : formData.unitPrice}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({ ...formData, unitPrice: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-4 py-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-black text-blue-600 dark:text-blue-400"
                />
            </div>

            {/* Technical Details */}
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material do Móvel</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['MDP', 'MDF', 'MDP/MDF', 'Mad. Maciça', 'Metal/MDP', 'Metal', 'Outro'].map(mat => (
                                <button
                                    key={mat}
                                    type="button"
                                    onClick={() => {
                                        if (mat === 'Outro') {
                                            setFormData({ ...formData, material: '' });
                                        } else {
                                            setFormData({ ...formData, material: mat });
                                        }
                                    }}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${((mat !== 'Outro' && formData.material === mat) || (mat === 'Outro' && !['MDP', 'MDF', 'MDP/MDF', 'Mad. Maciça', 'Metal/MDP', 'Metal'].includes(formData.material || ''))) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-blue-300'}`}
                                >
                                    {mat}
                                </button>
                            ))}
                        </div>
                        {(!['MDP', 'MDF', 'MDP/MDF', 'Mad. Maciça', 'Metal/MDP', 'Metal'].includes(formData.material || '') || formData.material === '') && (
                            <input
                                value={formData.material || ''}
                                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                placeholder="Digite o material personalizado..."
                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                            />
                        )}
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="md:col-span-2">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                                <i className="bi bi-magic"></i> Refinamento para IA (Estilo Magalu)
                            </h5>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Modelo / Linha <span className="text-red-500">*</span></label>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, hasNoLine: !formData.hasNoLine, line: !formData.hasNoLine ? '' : formData.line })}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${formData.hasNoLine ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    <i className={`bi ${formData.hasNoLine ? 'bi-check-circle-fill' : 'bi-circle'}`}></i> Sem Modelo / Linha
                                </button>
                            </div>
                            <input
                                value={formData.line || ''}
                                onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                                disabled={formData.hasNoLine}
                                placeholder={formData.hasNoLine ? "NÃO APLICÁVEL" : "Ex: Modelo Premium Lux"}
                                className={`w-full px-4 py-3 border rounded-xl text-xs font-bold transition-all ${formData.hasNoLine ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed italic' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500'}`}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Diferencial Principal (Copy)</label>
                            <input
                                value={formData.mainDifferential || ''}
                                onChange={(e) => setFormData({ ...formData, mainDifferential: e.target.value })}
                                placeholder="Ex: Dobradiças com amortecimento"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cores Disponíveis</label>
                            <input
                                value={formData.colors || ''}
                                onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                                placeholder="Ex: Off White / Castanho"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">O que NÃO acompanha</label>
                            <input
                                value={formData.notIncluded || ''}
                                onChange={(e) => setFormData({ ...formData, notIncluded: e.target.value })}
                                placeholder="Ex: Tampo, pia e eletros"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold"
                            />
                        </div>
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
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Largura</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, noWidth: !prev.noWidth }))}
                                        className={`text-[7px] font-black uppercase tracking-tight px-1 py-0.5 rounded transition-colors ${formData.noWidth ? 'bg-amber-100 text-amber-700' : 'text-slate-300 hover:text-slate-500'}`}
                                    >
                                        {formData.noWidth ? 'Mostrar' : 'Ocultar'}
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={formData.noWidth || isNaN(formData.width as number) || formData.width === 0 ? '' : formData.width}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, width: isNaN(val) ? 0 : val });
                                    }}
                                    disabled={formData.noWidth}
                                    placeholder={formData.noWidth ? "---" : "L"}
                                    className={`w-full px-3 py-3 rounded-xl text-xs font-bold text-center border transition-all ${formData.noWidth ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed italic' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200'}`}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Altura</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, noHeight: !prev.noHeight }))}
                                        className={`text-[7px] font-black uppercase tracking-tight px-1 py-0.5 rounded transition-colors ${formData.noHeight ? 'bg-amber-100 text-amber-700' : 'text-slate-300 hover:text-slate-500'}`}
                                    >
                                        {formData.noHeight ? 'Mostrar' : 'Ocultar'}
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={formData.noHeight || isNaN(formData.height as number) || formData.height === 0 ? '' : formData.height}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, height: isNaN(val) ? 0 : val });
                                    }}
                                    disabled={formData.noHeight}
                                    placeholder={formData.noHeight ? "---" : "A"}
                                    className={`w-full px-3 py-3 rounded-xl text-xs font-bold text-center border transition-all ${formData.noHeight ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed italic' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200'}`}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Profund.</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, noDepth: !prev.noDepth }))}
                                        className={`text-[7px] font-black uppercase tracking-tight px-1 py-0.5 rounded transition-colors ${formData.noDepth ? 'bg-amber-100 text-amber-700' : 'text-slate-300 hover:text-slate-500'}`}
                                    >
                                        {formData.noDepth ? 'Mostrar' : 'Ocultar'}
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={formData.noDepth || isNaN(formData.depth as number) || formData.depth === 0 ? '' : formData.depth}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, depth: isNaN(val) ? 0 : val });
                                    }}
                                    disabled={formData.noDepth}
                                    placeholder={formData.noDepth ? "---" : "P"}
                                    className={`w-full px-3 py-3 rounded-xl text-xs font-bold text-center border transition-all ${formData.noDepth ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed italic' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200'}`}
                                />
                            </div>
                        </div>

                        {/* Dimensions Preview */}
                        <div className="mt-2 p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Visualização do Resultado Final</label>
                            <div className="flex items-center gap-2">
                                <div className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-black text-slate-700 dark:text-slate-200 tracking-tight flex-1">
                                    {[
                                        !formData.noWidth && formData.width ? `L ${formData.width}CM` : null,
                                        !formData.noHeight && formData.height ? `A ${formData.height}CM` : null,
                                        !formData.noDepth && formData.depth ? `P ${formData.depth}CM` : null
                                    ].filter(Boolean).join(' X ') || <span className="text-slate-300 dark:text-slate-600 font-bold italic">DIMENSÕES NÃO INFORMADAS</span>}
                                </div>
                                <i className="bi bi-eye-fill text-slate-300 dark:text-slate-700 text-lg"></i>
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
                                    <div className="mt-2 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl animate-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <i className="bi bi-truck text-orange-600"></i>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Alerta de Carga Pesada (LTL)</span>
                                        </div>
                                        <ul className="text-[9px] font-bold text-orange-700/70 dark:text-orange-400 list-disc list-inside">
                                            {ltl.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                        </ul>
                                        <p className="text-[8px] mt-2 text-orange-600/50 uppercase font-black italic">Considere enviar via transportadora especializada.</p>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
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
                                    value={dim.label}
                                    onChange={(e) => {
                                        const next = [...(formData.extraDimensions || [])];
                                        next[idx].label = e.target.value;
                                        setFormData({ ...formData, extraDimensions: next });
                                    }}
                                    placeholder="Label (ex: Assento)"
                                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                                />
                                <input
                                    value={dim.value}
                                    onChange={(e) => {
                                        const next = [...(formData.extraDimensions || [])];
                                        next[idx].value = e.target.value;
                                        setFormData({ ...formData, extraDimensions: next });
                                    }}
                                    placeholder="Valor (ex: 45cm)"
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


            {/* Observations */}
            <div className="md:col-span-2 mt-4">
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
