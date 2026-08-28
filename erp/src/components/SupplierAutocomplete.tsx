import React, { useState, useEffect, useRef } from 'react';
import Person from '../pages/types/person.type';
import DropdownPortal from './shared/DropdownPortal';

interface SupplierAutocompleteProps {
    suppliers: Person[];
    selectedSupplierId: string;
    onSelect: (supplierId: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    disabled?: boolean;
    disabledReason?: string;
}

const SupplierAutocomplete: React.FC<SupplierAutocompleteProps> = ({
    suppliers,
    selectedSupplierId,
    onSelect,
    placeholder = "Buscar fornecedor...",
    className = "",
    inputClassName = "w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 focus:shadow-sm",
    disabled = false,
    disabledReason = ""
}) => {
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    const [query, setQuery] = useState(selectedSupplier?.fullName || "");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sincronizar query se o fornecedor selecionado mudar externamente
    useEffect(() => {
        if (selectedSupplier) {
            setQuery(selectedSupplier.fullName);
        } else {
            setQuery("");
        }
    }, [selectedSupplierId, suppliers]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
                // Se a query digitada não corresponder a um fornecedor válido, restaura o selecionado
                if (selectedSupplier) {
                    setQuery(selectedSupplier.fullName);
                } else {
                    setQuery("");
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedSupplier]);

    const normalize = (str: string) => 
        (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const queryNorm = normalize(query);

    // Filtrar sugestões localmente
    const filteredSuggestions = queryNorm.length >= 2 
        ? suppliers.filter(s => {
            const nameNorm = normalize(s.fullName);
            const tradeNorm = normalize(s.tradeName || "");
            const docNorm = normalize(s.document || "");
            return nameNorm.includes(queryNorm) || tradeNorm.includes(queryNorm) || docNorm.includes(queryNorm);
          })
        : [];

    return (
        <div ref={wrapperRef} className={`relative flex flex-col gap-2 ${className}`}>
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor</label>
                {disabled && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                        <i className="bi bi-lock-fill text-[10px]" /> Bloqueado
                    </span>
                )}
            </div>
            <div className="relative">
                <input
                    type="text"
                    autoComplete="off"
                    value={query}
                    disabled={disabled}
                    onChange={(e) => {
                        if (disabled) return;
                        const val = e.target.value;
                        setQuery(val);
                        setShowSuggestions(val.trim().length >= 2);
                        if (val.trim() === "") {
                            onSelect("");
                        }
                    }}
                    onFocus={() => {
                        if (!disabled) setShowSuggestions(query.trim().length >= 2);
                    }}
                    placeholder={disabled ? "Fornecedor fixado para os itens atuais" : placeholder}
                    className={`${inputClassName} ${disabled ? 'opacity-70 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
                    title={disabled ? (disabledReason || "Para trocar de fornecedor, remova todos os itens do pedido.") : undefined}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <i className={`bi ${disabled ? 'bi-lock-fill text-amber-500' : 'bi-truck'} text-base`} />
                </div>
            </div>
            {disabled && disabledReason && (
                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <i className="bi bi-info-circle text-[10px]" />
                    {disabledReason}
                </p>
            )}

            <DropdownPortal anchorRef={wrapperRef} isOpen={!disabled && showSuggestions && query.trim().length >= 2}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredSuggestions.length === 0 ? (
                        <div className="px-4 py-4 text-center text-xs font-bold text-slate-400">
                            Nenhum fornecedor encontrado.
                        </div>
                    ) : (
                        filteredSuggestions.map((supplier) => {
                            const hasTradeName = supplier.tradeName && supplier.tradeName.trim() !== "" && supplier.tradeName !== supplier.fullName;
                            return (
                                <button
                                    key={supplier.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(supplier.id!);
                                        setQuery(supplier.fullName);
                                        setShowSuggestions(false);
                                    }}
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
        </div>
    );
};

export default SupplierAutocomplete;
