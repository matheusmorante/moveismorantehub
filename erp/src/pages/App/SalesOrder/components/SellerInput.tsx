import React, { useState, useEffect, useRef } from 'react';
import { subscribeToPeople } from '@/pages/utils/personService';
import Person from '@/pages/types/person.type';
import { isValidEmployee } from '@/pages/utils/accessRoles';

interface SellerInputProps {
    value: string;
    sellerId?: string;
    onChange: (sellerName: string) => void;
    onSelectSeller?: (seller: { name: string; id?: string }) => void;
    onAddNewSeller?: () => void;
    placeholder?: string;
    className?: string;
    isAIFilling?: boolean;
}

export const SellerInput: React.FC<SellerInputProps> = ({
    value,
    sellerId,
    onChange,
    onSelectSeller,
    onAddNewSeller,
    placeholder = "Digite para buscar vendedor...",
    className = "",
    isAIFilling = false
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
            const validEmployees = data.filter(e => isValidEmployee(e));
            setEmployees(validEmployees);
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
        <div ref={containerRef} className={`relative flex-1 flex flex-col group ${className}`}>
            <div className="flex items-center justify-between mb-2 ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <i className="bi bi-person-badge text-blue-500 text-xs" />
                    Vendedor
                </label>

                {isAIFilling && (
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
                        <i className="bi bi-stars" /> IA trabalhando neste campo...
                    </span>
                )}
            </div>

            <div className="relative flex items-center">
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
                    className={`w-full border-b-2 bg-transparent px-3 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 outline-none transition-colors dark:text-slate-100 dark:placeholder:text-slate-600 ${
                        isAIFilling
                        ? 'border-violet-500 animate-pulse bg-violet-50/20 dark:bg-violet-950/20'
                        : 'border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500'
                    }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {filterText ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFilterText('');
                                onChange('');
                                setIsOpen(true);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="Limpar vendedor"
                        >
                            <i className="bi bi-x-circle-fill text-sm" />
                        </button>
                    ) : (
                        <i className={`bi bi-chevron-down text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                </div>
            </div>

            {/* Dropdown Modal que aparece diretamente abaixo do campo de texto com base no filtro */}
            {isOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-1.5 animate-slide-up">
                    {filtered.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                            {filtered.map((e) => {
                                const sellerName = e.nickname || e.fullName;
                                const isSelected = (sellerId && String(e.id) === String(sellerId)) || (value || '').toLowerCase() === sellerName.toLowerCase() || (value || '').toLowerCase() === e.fullName.toLowerCase();
                                return (
                                    <button
                                        key={e.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(sellerName);
                                            if (onSelectSeller) {
                                                onSelectSeller({ name: sellerName, id: e.id ? String(e.id) : undefined });
                                            }
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
