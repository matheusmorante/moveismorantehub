import React, { useState } from "react";
import { createPortal } from "react-dom";
import VariationType, { VariationOption } from "../../../types/variation.type";
import { useVariations } from "../../Variations/useVariations";
import { saveVariation, updateVariation, checkVariationUsage } from "../../../utils/variationService";
import { toast } from "react-toastify";
import { normalizeSearchTerm } from "../../../utils/textUtils";

interface ManageAttributesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ManageAttributesModal: React.FC<ManageAttributesModalProps> = ({ isOpen, onClose }) => {
    const { variations, loading, handleDelete, refresh } = useVariations();

    const [searchTerm, setSearchTerm] = useState("");
    const [newAttrName, setNewAttrName] = useState("");
    const [tempValues, setTempValues] = useState<string[]>([]);
    const [currentValInput, setCurrentValInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [existingValInputs, setExistingValInputs] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const handleKeyDownTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = currentValInput.trim().replace(/,/g, "");
            if (val) {
                if (tempValues.includes(val)) {
                    toast.error("Este valor já foi adicionado!");
                    return;
                }
                setTempValues((prev) => [...prev, val]);
            }
            setCurrentValInput("");
        } else if (e.key === "Backspace" && !currentValInput) {
            setTempValues((prev) => prev.slice(0, -1));
        }
    };

    const handleSaveAttribute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAttrName.trim()) {
            toast.error("Preencha o nome do atributo!");
            return;
        }

        let finalValues = [...tempValues];
        const pendingVal = currentValInput.trim().replace(/,/g, "");
        if (pendingVal && !finalValues.includes(pendingVal)) {
            finalValues.push(pendingVal);
        }

        if (finalValues.length === 0) {
            toast.error("Adicione pelo menos um valor/rótulo!");
            return;
        }

        setIsSaving(true);
        try {
            await saveVariation({
                name: newAttrName.trim(),
                active: true,
                options: finalValues.map(val => ({ id: "", value: val }))
            });

            toast.success("Atributo criado com sucesso!");
            setNewAttrName("");
            setTempValues([]);
            setCurrentValInput("");
            refresh();
        } catch (err: any) {
            toast.error("Erro ao salvar: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteValue = async (attr: VariationType, opt: VariationOption) => {
        if (!confirm(`Tem certeza que deseja remover o valor "${opt.value}" do atributo "${attr.name}"?`)) return;

        try {
            const isUsed = await checkVariationUsage(attr.name, opt.value);
            if (isUsed) {
                toast.warning(`Não é possível excluir o valor "${opt.value}" pois ele está em uso em uma ou mais variações de produtos.`);
                return;
            }

            const updatedOptions = attr.options.filter(o => o.id !== opt.id);
            await updateVariation(attr.id!, { options: updatedOptions });
            toast.success("Valor removido com sucesso!");
            refresh();
        } catch (err: any) {
            toast.error("Erro ao remover valor: " + err.message);
        }
    };

    const handleAddValueToExisting = async (attr: VariationType) => {
        const valText = existingValInputs[attr.id!] || "";
        if (!valText.trim()) return;

        if (attr.options.some(o => o.value.toLowerCase() === valText.trim().toLowerCase())) {
            toast.error("Este valor já existe para este atributo!");
            return;
        }

        try {
            const updatedOptions = [...attr.options, { id: "", value: valText.trim() }];
            await updateVariation(attr.id!, { options: updatedOptions });
            toast.success("Valor adicionado com sucesso!");
            setExistingValInputs(prev => ({ ...prev, [attr.id!]: "" }));
            refresh();
        } catch (err: any) {
            toast.error("Erro ao adicionar valor: " + err.message);
        }
    };

    const filteredVariations = variations.filter(
        (v) =>
            normalizeSearchTerm(v.name).includes(normalizeSearchTerm(searchTerm)) ||
            (v.id && normalizeSearchTerm(v.id).includes(normalizeSearchTerm(searchTerm)))
    );

    return createPortal(
        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-950 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 z-10">
                {/* Header */}
                <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <i className="bi bi-gear-wide-connected text-xl" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Gerenciar Atributos e Valores
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Atributos globais do sistema para variações de produtos
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-6">
                    {/* Barra de busca */}
                    <div className="relative max-w-md">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input
                            type="text"
                            placeholder="Buscar atributos cadastrados..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold dark:text-slate-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Formulário Novo Atributo (Coluna Esquerda) */}
                        <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                            <div>
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <i className="bi bi-plus-circle-fill text-blue-600 text-xs" />
                                    Novo Atributo
                                </h4>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                                    Ex: Cor, Tamanho, Voltagem
                                </p>
                            </div>

                            <form onSubmit={handleSaveAttribute} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Nome do Atributo
                                    </label>
                                    <input
                                        placeholder="Ex: Cor, Tamanho, Material"
                                        value={newAttrName}
                                        onChange={(e) => setNewAttrName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold dark:text-slate-300"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Valores (Enter ou Vírgula)
                                    </label>
                                    <div className="min-h-[4.5rem] flex flex-wrap gap-1.5 p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl items-center">
                                        {tempValues.map((val, idx) => (
                                            <span
                                                key={idx}
                                                className="h-7 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-[11px] gap-1 px-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-center shrink-0"
                                            >
                                                {val}
                                                <button
                                                    type="button"
                                                    onClick={() => setTempValues((prev) => prev.filter((_, i) => i !== idx))}
                                                    className="text-blue-400 hover:text-red-500 transition-colors"
                                                >
                                                    <i className="bi bi-x text-xs" />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            placeholder={tempValues.length === 0 ? "Ex: Azul, Preto..." : ""}
                                            value={currentValInput}
                                            onChange={(e) => setCurrentValInput(e.target.value)}
                                            onKeyDown={handleKeyDownTagInput}
                                            className="flex-1 min-w-[80px] bg-transparent outline-none border-none text-xs p-1 font-bold dark:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSaving ? (
                                        <i className="bi bi-arrow-clockwise animate-spin text-sm" />
                                    ) : (
                                        <>Criar Atributo</>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Lista de Atributos Existentes (Coluna Direita) */}
                        <div className="lg:col-span-2 space-y-4">
                            {loading ? (
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center flex flex-col items-center justify-center gap-2">
                                    <i className="bi bi-arrow-clockwise animate-spin text-2xl text-blue-600" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Carregando atributos...</p>
                                </div>
                            ) : filteredVariations.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center text-slate-400 font-bold text-xs">
                                    Nenhum atributo encontrado.
                                </div>
                            ) : (
                                filteredVariations.map((attr) => (
                                    <div
                                        key={attr.id}
                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-3"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h5 className="text-sm font-black text-slate-800 dark:text-slate-100">{attr.name}</h5>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    {attr.options?.length || 0} valores vinculados
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(attr.id!, e)}
                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                                title="Excluir Atributo"
                                            >
                                                <i className="bi bi-trash text-sm" />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {attr.options?.map((opt) => (
                                                <span
                                                    key={opt.id}
                                                    className="h-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] gap-1.5 py-0 px-2.5 rounded-full flex items-center shrink-0"
                                                >
                                                    {opt.value}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteValue(attr, opt)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors flex items-center cursor-pointer"
                                                        title="Remover este valor"
                                                    >
                                                        <i className="bi bi-x text-xs" />
                                                    </button>
                                                </span>
                                            ))}
                                            {attr.options?.length === 0 && (
                                                <span className="text-slate-400 italic text-xs">Sem valores cadastrados</span>
                                            )}
                                        </div>

                                        {/* Adição rápida de valor */}
                                        <div className="flex gap-2 max-w-sm pt-1">
                                            <input
                                                placeholder="Novo valor..."
                                                value={existingValInputs[attr.id!] || ""}
                                                onChange={(e) => setExistingValInputs(prev => ({ ...prev, [attr.id!]: e.target.value }))}
                                                onKeyDown={async (e) => {
                                                    if (e.key === "Enter") {
                                                        await handleAddValueToExisting(attr);
                                                    }
                                                }}
                                                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold dark:text-slate-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddValueToExisting(attr)}
                                                className="bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-950 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:opacity-90 transition-all cursor-pointer"
                    >
                        Concluir
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ManageAttributesModal;
