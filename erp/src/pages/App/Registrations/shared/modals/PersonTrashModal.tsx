import React from 'react';
import PersonList, { PersonListRef } from '../components/PersonList';
import { PersonVisibilitySettings } from '../../../../types/person.type';
import Person from '../../../../types/person.type';
import { PersonFiltersData } from '../PersonPage';

interface PersonTrashModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    filters: PersonFiltersData;
    visibilitySettings: PersonVisibilitySettings;
    onToggleColumn: (column: keyof PersonVisibilitySettings) => void;
    onSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
    collectionName: string;
    storageKey: string;
    onEdit: (p: Person) => void;
    isEmployee: boolean;
    onViewPurchaseHistory?: (p: Person) => void;
    listRef?: React.RefObject<PersonListRef>;
}

const PersonTrashModal: React.FC<PersonTrashModalProps> = ({
    isOpen,
    onClose,
    title,
    filters,
    visibilitySettings,
    onToggleColumn,
    onSort,
    collectionName,
    storageKey,
    onEdit,
    isEmployee,
    onViewPurchaseHistory,
    listRef
}) => {
    if (!isOpen || isEmployee) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
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
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <PersonList
                        onEdit={onEdit}
                        filters={filters}
                        visibilitySettings={visibilitySettings}
                        onToggleColumn={onToggleColumn}
                        onSort={onSort}
                        collectionName={collectionName}
                        storageKey={storageKey}
                        onViewPurchaseHistory={onViewPurchaseHistory}
                        ref={listRef}
                    />
                </div>
            </div>
        </div>
    );
};

export default PersonTrashModal;
