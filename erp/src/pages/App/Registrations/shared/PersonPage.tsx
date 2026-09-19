import React, { useState, useRef } from "react";
import PersonFilters from "./components/PersonFilters";
import PersonList, { PersonListRef } from "./components/PersonList";
import PersonFormModal from "./modals/PersonFormModal";
import PersonPurchaseHistoryModal from "./modals/PersonPurchaseHistoryModal";
import PersonImportModal from "./modals/PersonImportModal";
import PersonTrashModal from "./modals/PersonTrashModal";
import PersonPageHeader from "./components/PersonPageHeader";
import { PersonPageToolbar } from "./components/PersonPageToolbar";
import Person, { PersonVisibilitySettings } from "../../../types/person.type";
import { useNavigate } from "react-router-dom";

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

export interface PersonPageProps {
    title: string;
    subtitle: string;
    newLabel: string;
    newIcon: string;
    collectionName: string;
    storageKey: string;
    canImport?: boolean;
}

const PersonPage = ({
    title,
    subtitle,
    newLabel,
    newIcon,
    collectionName,
    storageKey,
    canImport = false,
}: PersonPageProps) => {
    const isEmployee = collectionName === "employees";
    const isSupplier = collectionName === "suppliers";
    const isCustomer = collectionName === "customers";


    const DEFAULT_VISIBILITY: PersonVisibilitySettings = {
        id: false,
        fullName: true,
        cpfCnpj: !isEmployee,
        email: collectionName !== 'suppliers',
        phone: collectionName !== 'suppliers',
        address: collectionName !== 'suppliers',
        products: collectionName === 'suppliers',
        actions: true,
    };
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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

    return (
        <div className="flex -m-4 xl:-m-8 h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
            {/* Sidebar */}
            {!isEmployee && (
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
            )}

            {!isEmployee && isSidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden ${isSupplier || isCustomer ? 'p-2.5 sm:p-3 md:p-4' : 'p-4 md:p-10'}`}>
                {/* Header */}
                <PersonPageHeader
                    title={title}
                    subtitle={subtitle}
                    newLabel={newLabel}
                    newIcon={newIcon}
                    collectionName={collectionName}
                    canImport={canImport}
                    isSupplier={isSupplier}
                    isCustomer={isCustomer}
                    isEmployee={isEmployee}
                    onOpenAdd={openAdd}
                    onOpenTrash={() => setIsTrashOpen(true)}
                    onOpenImport={() => setIsImportModalOpen(true)}
                />

                <PersonPageToolbar
                    filters={filters}
                    setFilters={setFilters}
                    isSupplier={isSupplier}
                    isCustomer={isCustomer}
                    isEmployee={isEmployee}
                    collectionName={collectionName}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    setIsTrashOpen={setIsTrashOpen}
                    visibilitySettings={visibilitySettings}
                    toggleVisibility={toggleVisibility}
                />

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

            <PersonTrashModal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                title={title}
                filters={trashFilters}
                visibilitySettings={visibilitySettings}
                onToggleColumn={toggleVisibility}
                onSort={handleSort}
                collectionName={collectionName}
                storageKey={storageKey}
                onEdit={openEdit}
                isEmployee={isEmployee}
                onViewPurchaseHistory={isEmployee ? undefined : (p) => {
                    setHistoryPerson(p);
                    setIsHistoryModalOpen(true);
                }}
                listRef={trashListRef}
            />

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

            <PersonImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    listRef.current?.refresh();
                }}
                collectionName={collectionName}
                title={title}
            />
        </div>
    );
};

export default PersonPage;

