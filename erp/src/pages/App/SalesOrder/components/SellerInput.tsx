import React, { useState, useEffect, useRef } from 'react';
import { subscribeToPeople } from '@/pages/utils/personService';
import Person from '@/pages/types/person.type';

interface SellerInputProps {
    value: string;
    onChange: (sellerName: string) => void;
    onAddNewSeller?: () => void;
    placeholder?: string;
    className?: string;
}

export const SellerInput: React.FC<SellerInputProps> = ({
    value,
    onChange,
    onAddNewSeller,
    placeholder = "Digite para buscar vendedor...",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [employees, setEmployees] = useState<Person[]>([]);
    const [filterText, setFilterText] = useState(value || '');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFilterText(value || '');
    }, [value]);

    useEffect(() => {
        const unsub = subscribeToPeople('employees', (data) => {
            const activeEmployees = data.filter(e => e.active);
            setEmployees(activeEmployees);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = employees.filter(e => {
        const term = filterText.toLowerCase();
        return (
            (e.fullName || '').toLowerCase().includes(term) ||
            (e.nickname || '').toLowerCase().includes(term) ||
            (e.position || '').toLowerCase().includes(term)
        );
    });

    return (
        <div ref={containerRef} className={`relative flex-1 ${className}`}>
            <div className="flex items-center gap-3 w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text">
                <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <i className="bi bi-person-badge-fill text-lg" />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vendedor</span>
                    <input
                        type="text"
                        value={filterText}
                        onChange={(e) => {
                            const newVal = e.target.value;
                            setFilterText(newVal);
                            onChange(newVal);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="bg-transparent border-0 p-0 focus:ring-0 text-sm font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal outline-none w-full"
                    />
                </div>
                {filterText ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFilterText('');
                            onChange('');
                            setIsOpen(true);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors"
                        title="Limpar vendedor"
                    >
                        <i className="bi bi-x-circle-fill text-sm" />
                    </button>
                ) : (
                    <i className="bi bi-chevron-down text-xs text-slate-400" />
                )}
            </div>

            {/* Dropdown Modal que aparece diretamente abaixo do campo de texto com base no filtro */}
            {isOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-1.5 animate-slide-up">
                    {filtered.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                            {filtered.map((e) => {
                                const sellerName = e.nickname || e.fullName;
                                const isSelected = (value || '').toLowerCase() === sellerName.toLowerCase() || (value || '').toLowerCase() === e.fullName.toLowerCase();
                                return (
                                    <button
                                        key={e.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(sellerName);
                                            setFilterText(sellerName);
                                            setIsOpen(false);
                                        }}
                                        className={`flex items-center justify-between p-2.5 rounded-xl transition-all text-left w-full ${
                                            isSelected 
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold' 
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                <i className="bi bi-person-fill text-sm" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold truncate">{e.fullName}</span>
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                    {e.nickname && <span className="text-blue-500">@{e.nickname}</span>}
                                                    {e.position && <span>• {e.position}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && <i className="bi bi-check-lg text-blue-600 dark:text-blue-400 text-base ml-2 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-4 text-center">
                            <span className="text-xs font-medium text-slate-400 block mb-1">Nenhum vendedor encontrado</span>
                        </div>
                    )}

                    {onAddNewSeller && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onAddNewSeller();
                            }}
                            className="flex items-center justify-center gap-2 w-full p-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
                        >
                            <i className="bi bi-plus-circle-fill text-sm" />
                            <span>Cadastrar Novo Vendedor</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
export default SellerInput;
