import { useState } from "react";
import VariationType, { VariationOption } from "../../types/variation.type";
import { useVariations } from "./useVariations";
import { saveVariation, updateVariation, checkVariationUsage } from "../../utils/variationService";
import { toast } from "react-toastify";

const Variations = () => {
    const { variations, loading, handleDelete, refresh } = useVariations();

    const [searchTerm, setSearchTerm] = useState("");
    
    // Novo atributo state
    const [newAttrName, setNewAttrName] = useState("");
    const [tempValues, setTempValues] = useState<string[]>([]);
    const [currentValInput, setCurrentValInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Val inputs para atributos existentes (mapeado por attributeId)
    const [existingValInputs, setExistingValInputs] = useState<Record<string, string>>({});

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            try {
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                let startIndex = 0;
                if (lines.length > 0 && (lines[0].toLowerCase().includes("atributo") || lines[0].toLowerCase().includes("valor"))) {
                    startIndex = 1;
                }

                const capitalize = (str: string): string => {
                    if (!str) return "";
                    const trimmed = str.trim();
                    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                };

                const importedData: Record<string, Set<string>> = {};
                for (let i = startIndex; i < lines.length; i++) {
                    const row = lines[i];
                    let parts: string[] = [];
                    if (row.includes('"')) {
                        const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                        parts = matches ? matches.map(m => m.replace(/"/g, '').trim()) : row.split(',').map(p => p.trim());
                    } else {
                        parts = row.split(',').map(p => p.trim());
                    }

                    if (parts.length > 0 && parts[0]) {
                        const attrName = capitalize(parts[0]);
                        const valText = parts[1] ? capitalize(parts[1]) : "";
                        
                        if (!importedData[attrName]) {
                            importedData[attrName] = new Set<string>();
                        }
                        if (valText) {
                            importedData[attrName].add(valText);
                        }
                    }
                }

                let createdCount = 0;
                let updatedCount = 0;

                for (const [attrName, valsSet] of Object.entries(importedData)) {
                    const existingAttr = variations.find(v => v.name.toLowerCase() === attrName.toLowerCase());
                    const valsArray = Array.from(valsSet);

                    if (existingAttr) {
                        const currentVals = existingAttr.options.map(o => o.value.toLowerCase());
                        const newVals = valsArray.filter(v => !currentVals.includes(v.toLowerCase()));

                        if (newVals.length > 0) {
                            const updatedOptions = [
                                ...existingAttr.options,
                                ...newVals.map(v => ({ id: "", value: v }))
                            ];
                            await updateVariation(existingAttr.id!, { options: updatedOptions });
                            updatedCount++;
                        }
                    } else {
                        await saveVariation({
                            name: attrName,
                            active: true,
                            options: valsArray.map(v => ({ id: "", value: v }))
                        });
                        createdCount++;
                    }
                }

                toast.success(`Importação concluída! ${createdCount} atributos criados, ${updatedCount} atualizados.`);
                refresh();
            } catch (err: any) {
                toast.error("Erro ao importar CSV: " + err.message);
            }
        };

        reader.readAsText(file, "UTF-8");
        e.target.value = "";
    };

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
        if (pendingVal) {
            if (!finalValues.includes(pendingVal)) {
                finalValues.push(pendingVal);
            }
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
            // Verificar se o valor está em uso por algum produto
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
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.id && v.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 overflow-hidden relative">
            {/* Header */}
            <header className="flex-shrink-0 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 p-8 shadow-sm relative z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <i className="bi bi-stars text-2xl text-blue-600 animate-pulse" />
                            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Atributos
                            </h1>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Gerencie as propriedades (ex: Cor, Tamanho, Material) utilizadas na grade de variações
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative group">
                            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar atributos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold dark:text-slate-300 w-full md:w-64"
                            />
                        </div>

                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 relative z-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Formulário de Criação (Coluna Esquerda) */}
                        <div className="lg:col-span-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm h-fit space-y-6">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <i className="bi bi-plus-circle-fill text-blue-600" />
                                    Novo Atributo
                                </h2>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                    Cadastre propriedades reutilizáveis
                                </p>
                            </div>

                            <form onSubmit={handleSaveAttribute} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Nome do Atributo
                                    </label>
                                    <input
                                        placeholder="Ex: Cor, Tamanho, Voltagem"
                                        value={newAttrName}
                                        onChange={(e) => setNewAttrName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold dark:text-slate-300"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Valores (Enter ou Vírgula)
                                    </label>
                                    <div className="min-h-[5rem] flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                        {tempValues.map((val, idx) => (
                                            <span
                                                key={idx}
                                                className="h-8 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-xs gap-1.5 py-0 px-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center shrink-0"
                                            >
                                                {val}
                                                <button
                                                    type="button"
                                                    onClick={() => setTempValues((prev) => prev.filter((_, i) => i !== idx))}
                                                    className="text-blue-400 hover:text-red-500 rounded-full transition-colors flex items-center"
                                                >
                                                    <i className="bi bi-x-lg text-[10px]" />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            placeholder={tempValues.length === 0 ? "Ex: Azul, Preto..." : ""}
                                            value={currentValInput}
                                            onChange={(e) => setCurrentValInput(e.target.value)}
                                            onKeyDown={handleKeyDownTagInput}
                                            className="flex-1 min-w-[100px] bg-transparent outline-none border-none text-sm p-1 font-bold dark:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
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
                        <div className="lg:col-span-2 space-y-6">
                            {loading ? (
                                <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-12 text-center shadow-sm flex flex-col items-center justify-center gap-3">
                                    <i className="bi bi-arrow-clockwise animate-spin text-3xl text-blue-600" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Carregando atributos...</p>
                                </div>
                            ) : filteredVariations.length === 0 ? (
                                <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-12 text-center shadow-sm italic text-slate-400 font-bold">
                                    Nenhum atributo cadastrado.
                                </div>
                            ) : (
                                filteredVariations.map((attr) => (
                                    <div
                                        key={attr.id}
                                        className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm space-y-6"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{attr.name}</h3>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                                    Valores vinculados a este atributo
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(attr.id!, e)}
                                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                                title="Excluir Atributo"
                                            >
                                                <i className="bi bi-trash text-lg" />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2.5">
                                            {attr.options?.map((opt) => (
                                                <span
                                                    key={opt.id}
                                                    className="h-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs gap-2 py-0 px-3 rounded-full flex items-center shrink-0 group transition-colors"
                                                >
                                                    {opt.value}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteValue(attr, opt)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors flex items-center cursor-pointer"
                                                        title="Remover este valor"
                                                    >
                                                        <i className="bi bi-x-lg text-[9px]" />
                                                    </button>
                                                </span>
                                            ))}
                                            {attr.options?.length === 0 && (
                                                <span className="text-slate-400 italic text-xs">Sem valores cadastrados</span>
                                            )}
                                        </div>

                                        {/* Formulário rápido para adicionar valor avulso */}
                                        <div className="flex gap-3 max-w-md pt-2">
                                            <input
                                                placeholder="Adicionar novo valor..."
                                                value={existingValInputs[attr.id!] || ""}
                                                onChange={(e) => setExistingValInputs(prev => ({ ...prev, [attr.id!]: e.target.value }))}
                                                onKeyDown={async (e) => {
                                                    if (e.key === "Enter") {
                                                        await handleAddValueToExisting(attr);
                                                    }
                                                }}
                                                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold dark:text-slate-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddValueToExisting(attr)}
                                                className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
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
            </main>
        </div>
    );
};

export default Variations;
