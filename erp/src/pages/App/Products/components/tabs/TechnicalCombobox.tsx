import React, { useState, useRef, useEffect, useMemo } from 'react';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

interface TechnicalValueOption {
    readonly id?: string;
    readonly value: string;
}

interface TechnicalComboboxProps {
    readonly fieldName: string;
    readonly value?: string;
    readonly options: readonly TechnicalValueOption[];
    readonly placeholder?: string;
    readonly isInvalid?: boolean;
    readonly disabled?: boolean;
    readonly onChange: (val: string) => void;
}

export const TechnicalCombobox: React.FC<TechnicalComboboxProps> = ({
    fieldName,
    value,
    options,
    placeholder,
    isInvalid,
    disabled,
    onChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || '');
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Sincroniza o texto digitado se o valor mudar externamente
    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Se fechou sem selecionar e o texto não bater com o valor atual, volta ao selecionado
                setSearchTerm(value || '');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [value]);

    const cleanedSearch = searchTerm.trim();
    const isSearchAllowed = cleanedSearch.length >= 2;

    const filteredOptions = useMemo(() => {
        if (!isSearchAllowed) {
            return [];
        }
        const term = normalizeSearchTerm(cleanedSearch);
        return options.filter(opt => {
            const optVal = opt?.value ? String(opt.value) : '';
            return normalizeSearchTerm(optVal).includes(term);
        });
    }, [options, cleanedSearch, isSearchAllowed]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        setIsOpen(true);
        // Se apagar tudo, limpa a seleção
        if (!val.trim()) {
            onChange('');
        }
    };

    const handleSelectOption = (optVal: string) => {
        setSearchTerm(optVal);
        onChange(optVal);
        setIsOpen(false);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm(value || '');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                handleSelectOption(filteredOptions[0].value);
            }
        } else if (e.key === 'ArrowDown') {
            setIsOpen(true);
        }
    };

    const hasSelectedValue = Boolean(value && String(value).trim() !== '');
    const isNotApplicable = String(value || '').trim().toLowerCase() === 'não se aplica' || 
                            String(value || '').trim().toLowerCase() === 'nao se aplica' || 
                            String(value || '').trim().toUpperCase() === 'N/A';

    return (
        <div ref={containerRef} className="relative w-full mt-1">
            <div className="relative flex items-center">
                <i className={`bi bi-search absolute left-0.5 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none transition-colors ${
                    disabled
                        ? 'text-emerald-500'
                        : isInvalid
                        ? 'text-red-500'
                        : hasSelectedValue
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400'
                }`} />

                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    readOnly={disabled}
                    onFocus={disabled ? undefined : () => setIsOpen(true)}
                    onChange={disabled ? undefined : handleInputChange}
                    onKeyDown={disabled ? undefined : handleKeyDown}
                    placeholder={placeholder || `Busque e selecione ${fieldName}...`}
                    className={`w-full pl-6 pr-6 py-2 border-b-2 border-t-0 border-x-0 rounded-none text-xs outline-none transition-all ${
                        disabled || isNotApplicable
                            ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed'
                            : isInvalid
                            ? 'bg-transparent border-red-500 text-red-600 dark:text-red-400 placeholder:text-red-300'
                            : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-blue-600 dark:focus:border-blue-400'
                    } ${!disabled && !isNotApplicable && hasSelectedValue ? 'font-bold' : ''}`}
                />

                {!disabled && searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            onChange('');
                            setIsOpen(true);
                            inputRef.current?.focus();
                        }}
                        aria-label="Limpar campo"
                        className="absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer text-xs transition-colors"
                    >
                        <i className="bi bi-x-circle-fill" />
                    </button>
                )}
            </div>

            {/* Painel de Resultados logo abaixo do input */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-1.5 space-y-0.5">
                        {!isSearchAllowed ? (
                            <div className="p-4 text-center text-slate-400 text-xs">
                                <i className="bi bi-keyboard text-base text-blue-500 opacity-60 mb-1 block" />
                                <span className="font-bold text-slate-500 dark:text-slate-400">
                                    {cleanedSearch.length === 0 
                                        ? 'Digite no mínimo 2 caracteres para pesquisar' 
                                        : 'Digite mais 1 caractere para pesquisar'}
                                </span>
                            </div>
                        ) : filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-xs">
                                <i className="bi bi-search text-base opacity-40 mb-1 block" />
                                <span>Nenhum resultado para "{searchTerm}"</span>
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = value === opt.value;
                                return (
                                    <button
                                        key={opt.id || opt.value}
                                        type="button"
                                        onMouseDown={(e) => {
                                            // onMouseDown dispara antes do blur do input
                                            e.preventDefault();
                                            handleSelectOption(opt.value);
                                        }}
                                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        <span className="truncate">{opt.value}</span>
                                        {isSelected && (
                                            <i className="bi bi-check-circle-fill text-blue-600 dark:text-blue-400 text-xs shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
