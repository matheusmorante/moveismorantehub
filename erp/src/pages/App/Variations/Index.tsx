import { useState } from "react";
import VariationType, { VariationOption, VariationVisibilitySettings } from "../../types/variation.type";
import VariationFormModal from "./VariationFormModal";
import { useVariations } from "./useVariations";
import { useWindowSize } from "../../../hooks/useWindowSize";

type VisibilityKey = keyof VariationVisibilitySettings;

const COLUMN_OPTIONS: { key: VisibilityKey; label: string }[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Nome do Atributo" },
    { key: "options", label: "Valores" },
];

const DEFAULT_VISIBILITY: VariationVisibilitySettings = {
    id: true,
    name: true,
    options: true,
    actions: true,
};

const Variations = () => {
    const { variations, handleDelete } = useVariations();
    const { width } = useWindowSize();
    const isMobile = width <= 900;

    const [searchTerm, setSearchTerm] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingVariation, setEditingVariation] = useState<VariationType | null>(null);
    const [visibility, setVisibility] = useState<VariationVisibilitySettings>(DEFAULT_VISIBILITY);
    const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

    const toggleColumn = (key: VisibilityKey) =>
        setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

    const openEdit = (variation: VariationType) => {
        setEditingVariation(variation);
        setIsFormOpen(true);
    };

    const openAdd = () => {
        setEditingVariation(null);
        setIsFormOpen(true);
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
                            <i className="bi bi-ui-radios text-2xl text-blue-600" />
                            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Atributos e Valores
                            </h1>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Gestão de Atributos e Opções (Cores, Tamanhos, Materiais)
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

                        {!isMobile && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                                    className="h-11 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl flex items-center justify-center transition-all shadow-sm group"
                                    title="Colunas Visíveis"
                                >
                                    <i className="bi bi-view-list text-lg text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </button>

                                {showVisibilityMenu && (
                                    <div className="absolute right-0 top-14 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl p-4 z-50">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                                            Colunas Visíveis
                                        </h4>
                                        <div className="flex flex-col gap-1">
                                            {COLUMN_OPTIONS.map((col) => (
                                                <button
                                                    key={col.key}
                                                    onClick={() => toggleColumn(col.key)}
                                                    className="flex items-center justify-between px-3 py-2 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-600 dark:text-slate-300"
                                                >
                                                    {col.label}
                                                    <i
                                                        className={`bi bi-check text-lg ${
                                                            visibility[col.key]
                                                                ? "text-blue-600 opacity-100"
                                                                : "opacity-0"
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={openAdd}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <i className="bi bi-plus-lg text-sm" />
                            <span className="hidden sm:inline">Novo Atributo / Valor</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 relative z-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {!isMobile ? (
                        <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-w-[800px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                        {visibility.id && <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">ID</th>}
                                        {visibility.name && <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Atributo</th>}
                                        {visibility.options && <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Valores</th>}
                                        {visibility.actions && <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-24">Ações</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {filteredVariations.length > 0 ? (
                                        filteredVariations.map((v) => (
                                            <tr
                                                key={v.id}
                                                onClick={() => openEdit(v)}
                                                className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                                            >
                                                {visibility.id && (
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        #{v.id}
                                                    </td>
                                                )}
                                                {visibility.name && (
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${v.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{v.name}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                {visibility.options && (
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {v.options.slice(0, 5).map((opt: VariationOption) => (
                                                                <span
                                                                    key={opt.id}
                                                                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700"
                                                                >
                                                                    {opt.value}
                                                                </span>
                                                            ))}
                                                            {v.options.length > 5 && (
                                                                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100 dark:border-blue-800">
                                                                    +{v.options.length - 5}
                                                                </span>
                                                            )}
                                                            {v.options.length === 0 && (
                                                                <span className="text-slate-400 italic text-xs">Sem valores cadastrados</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                                {visibility.actions && (
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center">
                                                            <button
                                                                onClick={(e) => handleDelete(v.id!, e)}
                                                                className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-colors flex items-center justify-center active:scale-95"
                                                                title="Apagar Atributo"
                                                            >
                                                                <i className="bi bi-trash" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm font-bold">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <i className="bi bi-ui-radios text-5xl opacity-20" />
                                                    {searchTerm ? "Nenhum atributo encontrado." : "Nenhum atributo cadastrado."}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredVariations.length > 0 ? (
                                filteredVariations.map((v) => (
                                    <div
                                        key={v.id}
                                        onClick={() => openEdit(v)}
                                        className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all relative overflow-hidden group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${v.active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300 dark:bg-slate-600"}`} />
                                                <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">{v.name}</h3>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(v.id!, e)}
                                                className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-colors flex items-center justify-center active:scale-90"
                                            >
                                                <i className="bi bi-trash text-lg" />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {v.options.map((opt: VariationOption) => (
                                                    <span
                                                        key={opt.id}
                                                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-100 dark:border-slate-800"
                                                    >
                                                        {opt.value}
                                                    </span>
                                                ))}
                                                {v.options.length === 0 && (
                                                    <span className="text-slate-400 italic text-xs">Sem valores cadastrados</span>
                                                )}
                                            </div>
                                            <div className="pt-2 flex justify-between items-center border-t border-slate-50 dark:border-slate-900">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    #{v.id}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                                    Editar Detalhes <i className="bi bi-chevron-right ml-1" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                    <div className="w-20 h-20 bg-white dark:bg-slate-950 rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 mb-4">
                                        <i className="bi bi-ui-radios text-3xl text-slate-200 dark:text-slate-800" />
                                    </div>
                                    <p className="text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase text-xs">
                                        {searchTerm ? "Nenhum atributo encontrado." : "Nenhum atributo cadastrado."}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <VariationFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                variation={editingVariation}
            />
        </div>
    );
};


export default Variations;
