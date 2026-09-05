import { useState } from "react";
import { ServiceVisibilitySettings } from "../../types/service.type";
import ServiceFormModal from "./ServiceFormModal";
import ServiceTable from "./ServiceTable";
import { useServices } from "./useServices";
import type Service from "../../types/service.type";
import { normalizeSearchTerm } from "../../utils/textUtils";

type VisibilityKey = keyof ServiceVisibilitySettings;

const COLUMN_OPTIONS: { key: VisibilityKey; label: string }[] = [
    { key: "id", label: "ID" },
    { key: "description", label: "Descrição" },
    { key: "unitPrice", label: "Preço" },
];

const DEFAULT_VISIBILITY: ServiceVisibilitySettings = {
    id: true,
    description: true,
    unitPrice: true,
    actions: true,
};

const Services = () => {
    const { services, handleDelete } = useServices();

    const [searchTerm, setSearchTerm] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [visibility, setVisibility] = useState<ServiceVisibilitySettings>(DEFAULT_VISIBILITY);
    const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

    const toggleColumn = (key: VisibilityKey) =>
        setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

    const openEdit = (service: Service) => {
        setEditingService(service);
        setIsFormOpen(true);
    };

    const openAdd = () => {
        setEditingService(null);
        setIsFormOpen(true);
    };

    const normSearch = normalizeSearchTerm(searchTerm);
    const filteredServices = services.filter(
        (s) =>
            normalizeSearchTerm(s.description).includes(normSearch) ||
            (s.id && normalizeSearchTerm(s.id).includes(normSearch))
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 overflow-hidden relative">
            {/* Header */}
            <header className="flex-shrink-0 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 p-8 shadow-sm relative z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <i className="bi bi-tools text-2xl text-blue-600" />
                            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Serviços
                            </h1>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Gestão de Serviços Prestados
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative group">
                            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar serviços..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold dark:text-slate-300 w-64"
                            />
                        </div>

                        {/* Column visibility */}
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

                        <button
                            onClick={openAdd}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <i className="bi bi-plus-lg text-sm" />
                            <span className="hidden sm:inline">Novo Serviço</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Table */}
            <main className="flex-1 overflow-x-auto overflow-y-auto p-8 relative z-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto min-w-[800px]">
                    <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                    {visibility.id && (
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            ID
                                        </th>
                                    )}
                                    {visibility.description && (
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Descrição
                                        </th>
                                    )}
                                    {visibility.unitPrice && (
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                                            Preço
                                        </th>
                                    )}
                                    {visibility.actions && (
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-24">
                                            Ações
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                <ServiceTable
                                    services={filteredServices}
                                    visibility={visibility}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    searchTerm={searchTerm}
                                />
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <ServiceFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                service={editingService}
            />
        </div>
    );
};

export default Services;
