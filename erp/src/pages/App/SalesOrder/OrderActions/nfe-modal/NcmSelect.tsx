import React, { useState, useEffect, useRef } from 'react';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';

interface NcmSelectProps {
    value: string;
    onChange: (ncm: string) => void;
    placeholder?: string;
}

export const NcmSelect: React.FC<NcmSelectProps> = ({
    value,
    onChange,
    placeholder = "Selecione ou digite o NCM..."
}) => {
    const [searchQuery, setSearchQuery] = useState(value || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [results, setResults] = useState<NcmSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSearchQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchNcms = async () => {
            if (searchQuery.trim().length < 2) {
                setResults([]);
                return;
            }
            setIsLoading(true);
            try {
                const res = await ncmService.searchNcms(searchQuery, 10);
                setResults(res);
            } catch (err) {
                console.error("Erro ao buscar NCMs:", err);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchNcms, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const cleanVal = (searchQuery || '').replace(/\D/g, '');
    const isNcmValid = cleanVal.length === 8;

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        // Atualiza o NCM no pai se forem 8 digitos
                        if (val.replace(/\D/g, '').length === 8) {
                            onChange(val.replace(/\D/g, '').slice(0, 8));
                        }
                        setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={placeholder}
                    className={`w-full pl-3 pr-7 py-1.5 bg-white dark:bg-slate-950 border rounded-xl outline-none text-xs font-mono font-bold transition-all ${
                        isNcmValid
                            ? 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:border-blue-500'
                            : 'border-red-400 bg-red-50/40 dark:bg-red-950/30 text-red-700 dark:text-red-300 focus:border-red-500'
                    }`}
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(prev => !prev);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-transform p-0.5"
                >
                    <i className={`bi bi-chevron-down text-[10px] transition-transform block ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isDropdownOpen && (searchQuery.length >= 2 || results.length > 0) && (
                <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                    {isLoading ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                            <i className="bi bi-arrow-repeat animate-spin mr-2" /> Buscando...
                        </div>
                    ) : results.length > 0 ? (
                        results.map(item => (
                            <div
                                key={item.code}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(item.code);
                                    setSearchQuery(item.code);
                                    setIsDropdownOpen(false);
                                }}
                                className="px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer transition-colors text-left rounded-xl group"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tracking-wider font-mono shrink-0 group-hover:text-blue-700">
                                        {item.code}
                                    </span>
                                    {item.code === cleanVal && (
                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                            Selecionado
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold leading-tight mt-0.5 line-clamp-2">
                                    {item.official_description}
                                </p>
                                {item.alias_match && (
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 italic flex items-center gap-1">
                                        <i className="bi bi-tag-fill" /> {item.alias_match}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                            Nenhum NCM encontrado para "{searchQuery}".
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
