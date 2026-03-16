import React, { useState, useEffect } from "react";
import VariationType, { VariationOption } from "../../types/variation.type";
import { saveVariation, checkVariationUsage } from "../../utils/variationService";
import { toast } from "react-toastify";

interface VariationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    variation?: VariationType | null;
    allVariations?: VariationType[];
}

const VariationFormModal = ({ isOpen, onClose, variation, allVariations = [] }: VariationFormModalProps) => {
    const [loading, setLoading] = useState(false);
    const [isCartesianMode, setIsCartesianMode] = useState(false);
    const [cartesianAttrA, setCartesianAttrA] = useState("");
    const [cartesianAttrB, setCartesianAttrB] = useState("");
    
    const initialFormData: Partial<VariationType> = {
        name: "",
        options: [],
        active: true,
    };

    const [formData, setFormData] = useState<Partial<VariationType>>(initialFormData);
    const [newOptionValue, setNewOptionValue] = useState("");

    useEffect(() => {
        if (variation) {
            setFormData(variation);
        } else {
            setFormData(initialFormData);
        }
        setNewOptionValue("");
        setIsCartesianMode(false);
        setCartesianAttrA("");
        setCartesianAttrB("");
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

    const generateCartesian = () => {
        const attrA = allVariations.find(v => v.id === cartesianAttrA);
        const attrB = allVariations.find(v => v.id === cartesianAttrB);

        if (!attrA || !attrB) {
            toast.error("Selecione dois atributos para combinar.");
            return;
        }

        const newOptions: VariationOption[] = [];
        attrA.options.forEach(optA => {
            attrB.options.forEach(optB => {
                newOptions.push({
                    id: Math.random().toString(36).substr(2, 9),
                    value: `${optA.value} ${optB.value}`
                });
            });
        });

        if (newOptions.length === 0) {
            toast.warning("Os atributos selecionados não possuem valores para combinar.");
            return;
        }

        setFormData(prev => ({
            ...prev,
            options: [...(prev.options || []), ...newOptions]
        }));
        setIsCartesianMode(false);
        toast.success(`${newOptions.length} combinações geradas!`);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error("O nome da variação é obrigatório (Ex: Cor).");
            return;
        }
        if (!formData.options || formData.options.length === 0) {
            toast.error("A variação deve ter pelo menos uma opção.");
            return;
        }

        setLoading(true);
        try {
            // Check if becoming inactive and is in use
            if (variation?.active && !formData.active) {
                const isInUse = await checkVariationUsage(formData.name);
                if (isInUse) {
                    toast.warning(`O atributo "${formData.name}" não pode ser inativado pois está vinculado a produtos.`);
                    setFormData(prev => ({ ...prev, active: true }));
                    setLoading(false);
                    return;
                }
            }

            await saveVariation(formData as VariationType);
            toast.success(variation ? "Variação atualizada!" : "Variação criada com sucesso!");
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar a variação.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {variation ? "Editar Atributo" : "Novo Atributo"}
                        </h2>
                        <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                            {variation ? `Editando ID: ${variation.id}` : "Configure os valores para este atributo (Ex: Cores)"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-8">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nome do Atributo (Ex: Cor, Tamanho, Material)</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                placeholder="Ex: Cor"
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Valores Disponíveis</h4>
                            
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
                                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100"
                                    placeholder="Adicionar novo valor (Ex: Azul, P, etc...)"
                                />
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="px-4 py-3 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                    Adicionar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCartesianMode(!isCartesianMode)}
                                    className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isCartesianMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                    title="Gerar combinações cartesianas (Ex: Cor + Tamanho)"
                                >
                                    <i className="bi bi-grid-3x3-gap" />
                                </button>
                            </div>

                            {isCartesianMode && (
                                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex flex-col gap-4 animate-fade-in shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <i className="bi bi-info-circle-fill text-amber-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">Modelo Cartesiano: Combine dois Atributos</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[9px] font-black uppercase text-amber-700/60 dark:text-amber-500 ml-1">Atributo A</span>
                                            <select
                                                value={cartesianAttrA}
                                                onChange={(e) => setCartesianAttrA(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-xs font-bold outline-none"
                                            >
                                                <option value="">Selecionar...</option>
                                                {allVariations.filter(v => v.id !== variation?.id).map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[9px] font-black uppercase text-amber-700/60 dark:text-amber-500 ml-1">Atributo B</span>
                                            <select
                                                value={cartesianAttrB}
                                                onChange={(e) => setCartesianAttrB(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-xs font-bold outline-none"
                                            >
                                                <option value="">Selecionar...</option>
                                                {allVariations.filter(v => v.id !== variation?.id).map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={generateCartesian}
                                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-200 dark:shadow-none"
                                    >
                                        Gerar Combinações
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 mt-2">
                                {formData.options?.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4 italic">Nenhum valor adicionado ainda.</p>
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
                                            className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold dark:text-slate-200 focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeOption(opt.id, opt.value)}
                                            className="w-12 h-12 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:hover:bg-red-500 transition-colors flex items-center justify-center shrink-0"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mt-4">
                            <div className="flex-1">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Status do Atributo</h4>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Inativar este atributo o esconderá no cadastro de produtos.</p>
                            </div>
                            <div className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} onClick={() => setFormData({ ...formData, active: !formData.active })}>
                                <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${formData.active ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <i className="bi bi-check-lg" />
                        )}
                        {variation ? "Salvar Alterações" : "Criar Atributo"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VariationFormModal;
