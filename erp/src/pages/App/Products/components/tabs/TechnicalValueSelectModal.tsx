import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

interface TechnicalValueOption {
    readonly id?: string;
    readonly value: string;
}

interface TechnicalValueSelectModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly fieldName: string;
    readonly currentValue?: string;
    readonly options: readonly TechnicalValueOption[];
    readonly onSelect: (value: string) => void;
}

export const TechnicalValueSelectModal: React.FC<TechnicalValueSelectModalProps> = ({
    isOpen,
    onClose,
    fieldName,
    currentValue,
    options,
    onSelect
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            // Foca no input após renderizar
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const cleanedSearch = searchTerm.trim();
    const isSearchActive = cleanedSearch.length > 0;

    const filteredOptions = useMemo(() => {
        if (!isSearchActive) {
            return options;
        }
        const term = normalizeSearchTerm(cleanedSearch);
        return options.filter(opt => {
            const optVal = opt?.value ? String(opt.value) : '';
            return normalizeSearchTerm(optVal).includes(term);
        });
    }, [options, cleanedSearch, isSearchActive]);

    if (!isOpen) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 z-[1000030] flex items-center justify-center p-4"
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    onClose();
                }
            }}
        >
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
                onClick={onClose} 
            />

            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                            <i className="bi bi-search text-blue-600" aria-hidden="true" />
                            <span>Pesquisar {fieldName}</span>
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                            {options.length} {options.length === 1 ? 'opção cadastrada' : 'opções cadastradas'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <i className="bi bi-x-lg text-sm" />
                    </button>
                </div>

                {/* Input de Busca com borda apenas embaixo (Regra 9) e filtro imediato */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
                    <div className="relative">
                        <i className="bi bi-search absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input
                            ref={inputRef}
                            autoFocus
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Digite para pesquisar em ${fieldName}...`}
                            className="w-full pl-7 pr-8 py-2 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-700 rounded-none text-xs font-bold outline-none focus:border-blue-600 dark:focus:border-blue-400 dark:text-slate-100 placeholder:font-medium placeholder:text-slate-400 transition-all"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                            >
                                <i className="bi bi-x-circle-fill" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Lista de Opções */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 min-h-[220px]">
                    {filteredOptions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <i className="bi bi-search text-2xl opacity-40 mb-2 block" />
                            <p className="text-xs font-bold">Nenhum valor encontrado para "{searchTerm}"</p>
                        </div>
                    ) : (
                        filteredOptions.map((opt) => {
                            const isSelected = currentValue === opt.value;
                            return (
                                <button
                                    key={opt.id || opt.value}
                                    type="button"
                                    onClick={() => {
                                        onSelect(opt.value);
                                        onClose();
                                    }}
                                    className={`w-full px-4 py-2.5 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-black'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-transparent'
                                    }`}
                                >
                                    <span>{opt.value}</span>
                                    {isSelected && (
                                        <i className="bi bi-check-circle-fill text-blue-600 dark:text-blue-400" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Rodapé */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
