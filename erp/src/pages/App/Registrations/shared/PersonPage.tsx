import React, { useState, useRef } from "react";
import PersonFilters from "./PersonFilters";
import PersonList from "./PersonList";
import PersonFormModal from "./PersonFormModal";
import PersonPurchaseHistoryModal from "./PersonPurchaseHistoryModal";
import Person, { PersonVisibilitySettings } from "../../../types/person.type";
import { useNavigate } from "react-router-dom";
import { PersonListRef } from "./PersonList";

export type PersonSortBy = "fullName" | "createdAt";

export interface PersonFiltersData {
    search: string;
    activeOnly: boolean | undefined;
    sortBy: PersonSortBy;
    sortOrder: "asc" | "desc";
    showTrash?: boolean;
    isDraft?: boolean;
}

const DEFAULT_FILTERS: PersonFiltersData = {
    search: "",
    activeOnly: undefined,
    sortBy: "fullName",
    sortOrder: "asc",
};

const DEFAULT_VISIBILITY: PersonVisibilitySettings = {
    id: false,
    fullName: true,
    cpfCnpj: true,
    email: true,
    phone: true,
    address: true,
    actions: true,
};

interface PersonPageProps {
    title: string;
    subtitle: string;
    newLabel: string;
    newIcon: string;
    collectionName: string;
    storageKey: string;
}

const PersonPage = ({
    title,
    subtitle,
    newLabel,
    newIcon,
    collectionName,
    storageKey,
}: PersonPageProps) => {
    const isEmployee = collectionName === "employees";

    const COLUMN_OPTIONS: { key: keyof PersonVisibilitySettings; label: string }[] = [
        { key: "id", label: "ID" },
        { key: "fullName", label: isEmployee ? "Nome" : "Nome / Razão Social" },
        { key: "cpfCnpj", label: isEmployee ? "CPF" : "CPF/CNPJ" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Telefone" },
        { key: "address", label: "Endereço" },
    ];

    const DEFAULT_VISIBILITY: PersonVisibilitySettings = {
        id: false,
        fullName: true,
        cpfCnpj: !isEmployee, // Default false for employees as requested
        email: true,
        phone: true,
        address: true,
        actions: true,
    };
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyPerson, setHistoryPerson] = useState<Person | null>(null);
    const [filters, setFilters] = useState<PersonFiltersData>(DEFAULT_FILTERS);
    const [visibilitySettings, setVisibilitySettings] =
        useState<PersonVisibilitySettings>(DEFAULT_VISIBILITY);
    const listRef = useRef<PersonListRef>(null);
    const trashListRef = useRef<PersonListRef>(null);
    const navigate = useNavigate();

    const toggleVisibility = (column: keyof PersonVisibilitySettings) => {
        setVisibilitySettings((prev) => ({ ...prev, [column]: !prev[column] }));
    };

    const handleSort = (sortBy: string, sortOrder: "asc" | "desc") => {
        setFilters((prev) => ({ ...prev, sortBy: sortBy as PersonSortBy, sortOrder }));
    };

    const openEdit = (p: Person) => {
        setEditingPerson(p);
        setIsFormModalOpen(true);
    };

    const openAdd = () => {
        setEditingPerson(null);
        setIsFormModalOpen(true);
    };

    const closeForm = () => {
        setIsFormModalOpen(false);
        setEditingPerson(null);
    };

    const activeFilters = React.useMemo(() => ({ ...filters, showTrash: false, isDraft: false }), [filters]);
    const trashFilters = React.useMemo(() => ({ ...filters, showTrash: true, isDraft: false }), [filters]);

    const sidebarBtnClass = `flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border ${
        isSidebarOpen
            ? "bg-white text-blue-600 border-blue-100 dark:bg-slate-900 dark:border-blue-900/30"
            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800"
    }`;

    const settingsBtnClass = `flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest ${
        showSettings
            ? "border-blue-200 text-blue-600 dark:border-blue-800"
            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
    }`;

    return (
        <div className="flex -m-4 xl:-m-8 h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
            {/* Sidebar */}
            <div
                className={`transition-all duration-300 ease-in-out border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 absolute md:relative z-30 h-full ${
                    isSidebarOpen
                        ? "w-[calc(100vw-32px)] md:w-80 shadow-2xl md:shadow-none"
                        : "w-0 opacity-0 overflow-hidden border-none"
                }`}
            >
                <div className="md:hidden flex justify-end p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 p-2"
                    >
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>
                <PersonFilters filters={filters} setFilters={setFilters} title={title} collectionName={collectionName} />
            </div>

            {isSidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-10">
                {/* Header */}
                <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-4 xl:gap-0">
                    <div>
                        <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                            {title}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                            {subtitle}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => navigate('/app/configuracoes')}
                            className="flex items-center justify-center p-3 xl:p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all w-full sm:w-auto mt-2 xl:mt-0"
                            title="Configurar Campos Obrigatórios"
                        >
                            <i className="bi bi-gear-fill text-lg xl:text-xl" />
                        </button>
                        <button
                            onClick={openAdd}
                            className="flex items-center justify-center gap-2 xl:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 xl:px-8 xl:py-4 rounded-xl xl:rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto mt-2 xl:mt-0"
                        >
                            <i className={`${newIcon} text-lg xl:text-xl`} />
                            {newLabel}
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center px-2">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={sidebarBtnClass}
                            >
                                <i className={`bi ${isSidebarOpen ? "bi-funnel-fill" : "bi-funnel"}`} />
                                Filtros
                            </button>

                            <button
                                onClick={() => setIsTrashOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500"
                            >
                                <i className="bi bi-trash3" />
                                Lixeira
                            </button>
                        </div>

                        {/* Visibility settings */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={settingsBtnClass}
                            >
                                <i className={`bi ${showSettings ? "bi-eye-slash-fill" : "bi-eye-fill"}`} />
                                Visualização
                            </button>

                            {showSettings && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowSettings(false)}
                                    />
                                    <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 animate-slide-up">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                                            Colunas da Tabela
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {COLUMN_OPTIONS.map((col) => (
                                                <button
                                                    key={col.key}
                                                    onClick={() => toggleVisibility(col.key)}
                                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 transition-all outline-none"
                                                >
                                                    <span
                                                        className={`text-[11px] font-bold ${
                                                            visibilitySettings[col.key]
                                                                ? "text-slate-700 dark:text-slate-200"
                                                                : "text-slate-300 dark:text-slate-700"
                                                        }`}
                                                    >
                                                        {col.label}
                                                    </span>
                                                    <div
                                                        className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
                                                            visibilitySettings[col.key]
                                                                ? "bg-blue-600 dark:bg-blue-500"
                                                                : "bg-slate-200 dark:bg-slate-800"
                                                        }`}
                                                    >
                                                        <div
                                                            className={`w-3 h-3 bg-white dark:bg-slate-300 rounded-full transition-transform ${
                                                                visibilitySettings[col.key]
                                                                    ? "translate-x-4"
                                                                    : "translate-x-0"
                                                            }`}
                                                        />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-transparent md:bg-white dark:bg-transparent dark:md:bg-slate-900 rounded-none md:rounded-3xl shadow-none md:shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-visible md:overflow-hidden md:border border-slate-100 dark:border-slate-800 transition-colors">
                        <PersonList
                            onEdit={openEdit}
                            filters={activeFilters}
                            visibilitySettings={visibilitySettings}
                            onToggleColumn={toggleVisibility}
                            onSort={handleSort}
                            collectionName={collectionName}
                            storageKey={storageKey}
                            onViewPurchaseHistory={isEmployee ? undefined : (p) => {
                                setHistoryPerson(p);
                                setIsHistoryModalOpen(true);
                            }}
                            ref={listRef}
                        />
                    </div>
                </div>
            </div>

            {/* Trash Modal */}
            {isTrashOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setIsTrashOpen(false)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl h-[80vh] rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                                    <i className="bi bi-trash3 text-red-500" />
                                    Lixeira de {title}
                                </h2>
                                <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                                    Gerencie {title.toLowerCase()} excluídos
                                </p>
                            </div>
                            <button
                                onClick={() => setIsTrashOpen(false)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <i className="bi bi-x-lg text-xl" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <PersonList
                                onEdit={openEdit}
                                filters={trashFilters}
                                visibilitySettings={visibilitySettings}
                                onToggleColumn={toggleVisibility}
                                onSort={handleSort}
                                collectionName={collectionName}
                                storageKey={storageKey}
                                onViewPurchaseHistory={isEmployee ? undefined : (p) => {
                                    setHistoryPerson(p);
                                    setIsHistoryModalOpen(true);
                                }}
                                ref={trashListRef}
                            />
                        </div>
                    </div>
                </div>
            )}


            {/* Form Modal */}
            <PersonFormModal
                isOpen={isFormModalOpen}
                onClose={closeForm}
                onSuccess={() => {
                    listRef.current?.refresh();
                    trashListRef.current?.refresh();
                }}
                person={editingPerson}
                collectionName={collectionName}
                title={title}
            />

            {historyPerson && (
                <PersonPurchaseHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => {
                        setIsHistoryModalOpen(false);
                        setHistoryPerson(null);
                    }}
                    person={historyPerson}
                />
            )}
        </div>
    );
};

export default PersonPage;
