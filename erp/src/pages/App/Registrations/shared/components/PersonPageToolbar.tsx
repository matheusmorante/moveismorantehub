import React from "react";
import { PersonFiltersData } from "../PersonPage";
import { PersonTableSettings } from "./PersonTableSettings";
import { PersonVisibilitySettings } from "../../../../types/person.type";

interface PersonPageToolbarProps {
    filters: PersonFiltersData;
    setFilters: React.Dispatch<React.SetStateAction<PersonFiltersData>>;
    isSupplier: boolean;
    isCustomer: boolean;
    isEmployee: boolean;
    collectionName: string;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (val: boolean) => void;
    setIsTrashOpen: (val: boolean) => void;
    visibilitySettings: PersonVisibilitySettings;
    toggleVisibility: (column: keyof PersonVisibilitySettings) => void;
}

export const PersonPageToolbar: React.FC<PersonPageToolbarProps> = ({
    filters,
    setFilters,
    isSupplier,
    isCustomer,
    isEmployee,
    collectionName,
    isSidebarOpen,
    setIsSidebarOpen,
    setIsTrashOpen,
    visibilitySettings,
    toggleVisibility,
}) => {
    const sidebarBtnClass = `flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-widest border ${
        isSidebarOpen
            ? "bg-white text-blue-600 border-blue-100 dark:bg-slate-900 dark:border-blue-900/30"
            : "bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800"
    }`;

    return (
        <>
            {(isSupplier || isCustomer) && (
                <div className="relative mt-2">
                    <i className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
                    <input
                        type="search"
                        value={filters.search}
                        onChange={(event) =>
                            setFilters((current) => ({ ...current, search: event.target.value }))
                        }
                        placeholder={
                            isCustomer
                                ? "Pesquisar cliente por nome, CPF/CNPJ, telefone ou e-mail..."
                                : "Pesquisar fornecedor por nome, razão social ou CPF/CNPJ"
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-blue-900/30"
                    />
                </div>
            )}

            <div className={`flex flex-col ${isSupplier || isCustomer ? "gap-2 mt-2" : "gap-6 mt-4"}`}>
                {!isEmployee && !isSupplier && collectionName !== "customers" && (
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

                        <PersonTableSettings
                            visibilitySettings={visibilitySettings}
                            toggleVisibility={toggleVisibility}
                            collectionName={collectionName}
                            isEmployee={isEmployee}
                        />
                    </div>
                )}
            </div>
        </>
    );
};
