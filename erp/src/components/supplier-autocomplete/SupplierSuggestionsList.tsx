import React from 'react';
import Person from '@/pages/types/person.type';
import DropdownPortal from '../shared/DropdownPortal';

interface SupplierSuggestionsListProps {
    anchorRef: React.RefObject<HTMLDivElement>;
    isOpen: boolean;
    suggestions: Person[];
    onSelect: (supplier: Person) => void;
}

export const SupplierSuggestionsList: React.FC<SupplierSuggestionsListProps> = ({
    anchorRef,
    isOpen,
    suggestions,
    onSelect
}) => {
    return (
        <DropdownPortal anchorRef={anchorRef} isOpen={isOpen}>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100 dark:divide-slate-800/50">
                {suggestions.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs font-bold text-slate-400">
                        Nenhum fornecedor encontrado.
                    </div>
                ) : (
                    suggestions.map((supplier) => {
                        const hasTradeName = supplier.tradeName && supplier.tradeName.trim() !== "" && supplier.tradeName !== supplier.fullName;
                        return (
                            <button
                                key={supplier.id}
                                type="button"
                                onClick={() => onSelect(supplier)}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-all flex flex-col justify-center gap-0.5 group"
                            >
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                    {supplier.fullName}
                                </span>
                                {hasTradeName && (
                                    <span className="text-[10px] text-slate-400 truncate">
                                        Fantasia: {supplier.tradeName}
                                    </span>
                                )}
                                {supplier.document && (
                                    <span className="text-[9px] font-mono text-slate-400">
                                        Doc: {supplier.document}
                                    </span>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </DropdownPortal>
    );
};
