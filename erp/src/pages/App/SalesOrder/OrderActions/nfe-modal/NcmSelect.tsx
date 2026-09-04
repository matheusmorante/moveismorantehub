import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface NcmOption {
    code: string;
    description: string;
}

export const COMMON_NCMS: NcmOption[] = [
    { code: "94035000", description: "Móveis de madeira para dormitórios (Guarda-roupa, Cama, Cômoda, Cabeceira, Criado-Mudo)" },
    { code: "94036000", description: "Outros móveis de madeira (Rack, Painel, Aparador, Mesa de Centro, Estante, Buffet)" },
    { code: "94016100", description: "Assentos com armação de madeira, estofados (Sofá, Poltrona, Cadeira Estofada, Banqueta)" },
    { code: "94033000", description: "Móveis de madeira para escritórios (Escrivaninha, Mesa de Reunião, Gaveteiro)" },
    { code: "94034000", description: "Móveis de madeira para cozinhas (Armário, Balcão, Paneleiro, Kit Cozinha)" },
    { code: "94016900", description: "Assentos com armação de madeira, não estofados (Cadeira de Madeira)" },
    { code: "94042100", description: "Colchões de espuma (borracha ou plástico alveolar)" },
    { code: "94042900", description: "Colchões de molas ou outros materiais" },
    { code: "94032000", description: "Outros móveis de metal (Mesa com base de aço, Escrivaninha Industrial)" },
    { code: "94017100", description: "Assentos com armação de metal, estofados (Banqueta Estofada, Cadeira de Metal)" },
    { code: "94017900", description: "Assentos com armação de metal, não estofados" },
    { code: "94039090", description: "Partes de móveis (Peças sobressalentes, portas, tampos)" },
    { code: "94038900", description: "Móveis de outras matérias (Plástico, Vime, Junco, etc.)" },
    { code: "39249000", description: "Utensílios de plástico para decoração ou uso doméstico" },
    { code: "70139900", description: "Objetos de vidro para decoração (Vasos, Pratos Decorativos)" },
    { code: "94051090", description: "Aparelhos de iluminação (Lustres, Luminárias de teto/parede)" }
];

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

    const filteredNcms = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return COMMON_NCMS;
        return COMMON_NCMS.filter(item =>
            item.code.includes(q) ||
            item.description.toLowerCase().includes(q)
        );
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
                        onChange(val.replace(/\D/g, '').slice(0, 8));
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

            {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                    {filteredNcms.map(item => (
                        <div
                            key={item.code}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(item.code);
                                setSearchQuery(item.code);
                                setIsDropdownOpen(false);
                            }}
                            className="px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer transition-colors text-left rounded-xl"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tracking-wider font-mono shrink-0">
                                    {item.code}
                                </span>
                                {item.code === cleanVal && (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                        Selecionado
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold leading-tight mt-0.5">
                                {item.description}
                            </p>
                        </div>
                    ))}
                    {filteredNcms.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400">
                            Nenhum NCM sugerido encontrado. Você pode digitar os 8 dígitos diretamente acima.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
