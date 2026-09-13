import React, { useState, useEffect, useRef, useMemo } from 'react';
import Product from '../../../../../types/product.type';
import { COMMON_NCMS } from '../productFiscalOptions';

interface ProductNcmSelectorProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    handleGenerateNCM: () => void;
    isGeneratingNCM: boolean;
}

export const ProductNcmSelector: React.FC<ProductNcmSelectorProps> = ({
    formData,
    setFormData,
    handleGenerateNCM,
    isGeneratingNCM
}) => {
    const [searchQuery, setSearchQuery] = useState(formData.fiscal?.ncm || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => setSearchQuery(formData.fiscal?.ncm || ''), [formData.fiscal?.ncm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredNcms = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return COMMON_NCMS;
        return COMMON_NCMS.filter(item =>
            item.code.includes(q) ||
            item.description.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    return (
        <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
            <div className="flex items-center justify-between gap-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">NCM *</label>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={isGeneratingNCM}
                        onClick={handleGenerateNCM}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/70 text-amber-600 dark:text-amber-400 font-black uppercase text-[9px] tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                        title="Usar IA para auto-preencher o NCM"
                    >
                        {isGeneratingNCM ? <i className="bi bi-arrow-repeat animate-spin text-amber-500" /> : <i className="bi bi-stars text-amber-500 text-xs font-bold" />}
                        {isGeneratingNCM ? 'Gerando NCM...' : 'Auto-preencher com IA'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsInfoModalOpen(true)}
                        className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                        title="Como funciona a IA do NCM?"
                    >
                        <i className="bi bi-info-circle text-xs" />
                    </button>
                </div>
            </div>
            <div
                className={`relative overflow-hidden rounded-2xl transition-all ${
                    isGeneratingNCM
                        ? 'ring-2 ring-amber-400/70 shadow-[0_0_18px_rgba(251,191,36,0.32)]'
                        : ''
                }`}
                aria-busy={isGeneratingNCM}
            >
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        setFormData(prev => ({
                            ...prev,
                            fiscal: {
                                ...prev.fiscal!,
                                ncm: val
                            }
                        }));
                        setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Digite ou pesquise o NCM..."
                    className={`w-full pl-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold dark:text-slate-200 tracking-wider font-mono transition-colors ${
                        isGeneratingNCM
                            ? 'pr-20 border-amber-400'
                            : 'pr-8 border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-400'
                    }`}
                />
                {isGeneratingNCM ? (
                    <>
                        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
                            <span className="ncm-input-shimmer absolute inset-y-0 left-0 w-1/3" />
                        </span>
                        <span
                            role="status"
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-300"
                        >
                            Gerando...
                        </span>
                    </>
                ) : (
                    <i className={`bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform pointer-events-none ${isDropdownOpen ? 'rotate-180' : ''}`} />
                )}
            </div>

            {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                    {filteredNcms.map(item => (
                        <div
                            key={item.code}
                            onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({
                                    ...prev,
                                    fiscal: {
                                        ...prev.fiscal!,
                                        ncm: item.code,
                                        ncmDescription: item.description
                                    }
                                }));
                                setSearchQuery(item.code);
                                setIsDropdownOpen(false);
                            }}
                            className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-left rounded-xl"
                        >
                            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">{item.code}</span>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{item.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {isInfoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                <i className="bi bi-stars text-amber-500" /> Inteligência Fiscal NCM
                            </h4>
                            <button onClick={() => setIsInfoModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            O gerador de NCM analisa o título, material e descrição do produto para sugerir a classificação fiscal mais adequada segundo a Nomenclatura Comum do Mercosul.
                        </p>
                        <button
                            onClick={() => setIsInfoModalOpen(false)}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
