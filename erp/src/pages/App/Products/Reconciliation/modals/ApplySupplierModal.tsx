import React, { useState, useCallback } from 'react';
import { supabase } from '../../../../utils/supabaseConfig';
import Person from '../../../../types/person.type';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (supplierId: string, replaceExisting: boolean) => Promise<void>;
    selectedCount: number;
    isAllFilteredSelected: boolean;
    totalFilteredCount: number;
}

export const ApplySupplierModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedCount,
    isAllFilteredSelected,
    totalFilteredCount,
}) => {
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Busca fornecedores do Supabase com debounce embutido no hook do componente
    const searchSuppliers = useCallback(async (term: string) => {
        if (!term || term.trim().length < 2) {
            setSuppliers([]);
            return;
        }
        setIsSearching(true);
        try {
            const safe = term.replace(/"/g, '');
            const { data, error } = await supabase
                .from('people')
                .select('id, full_name, social_name, nickname, cpf_cnpj')
                .or(`full_name.ilike."%${safe}%",social_name.ilike."%${safe}%"`)
                .or('person_type.ilike.suppliers,person_type.ilike.supplier')
                .eq('deleted', false)
                .order('full_name')
                .limit(20);

            if (error) throw error;

            const mapped: Person[] = (data || []).map((p: any) => ({
                id: p.id,
                fullName: p.full_name || '',
                tradeName: p.social_name || p.nickname || '',
                cpfCnpj: p.cpf_cnpj || '',
            }));
            setSuppliers(mapped);
        } catch {
            setSuppliers([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Watcher de mudança de query — chamado pelo handleInputChange do hook interno
    // Precisamos interceptar o onSelect e antes disso fazer a busca
    const handleQueryChange = useCallback((term: string) => {
        searchSuppliers(term);
    }, [searchSuppliers]);

    if (!isOpen) return null;

    const affectedCount = isAllFilteredSelected ? totalFilteredCount : selectedCount;

    const handleConfirm = async () => {
        if (!selectedSupplierId) return;
        setIsSubmitting(true);
        try {
            // replaceExisting = false fixo: sempre adiciona sem substituir fornecedores existentes
            await onConfirm(selectedSupplierId, false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelect = (id: string) => {
        setSelectedSupplierId(id);
        if (!id) setSuppliers([]);
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-visible border border-slate-200 dark:border-slate-800 animate-slide-up">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <i className="bi bi-magic text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                Atribuir Fornecedor
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                Operação em lote
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Contador */}
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <span className="text-lg font-black">{affectedCount}</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Produtos selecionados
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                                {isAllFilteredSelected
                                    ? 'Você selecionou todos os resultados do filtro atual.'
                                    : 'Você selecionou produtos manualmente nesta página.'}
                            </p>
                        </div>
                    </div>

                    {/* Campo de busca do fornecedor */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase text-slate-500 tracking-widest ml-1">
                            Fornecedor a atribuir
                        </label>

                        {/*
                          SupplierSearchField: input com busca live no Supabase.
                          Passamos os suppliers buscados dinamicamente para o componente
                          que faz a filtragem e exibe o dropdown.
                        */}
                        <SupplierSearchField
                            suppliers={suppliers}
                            selectedSupplierId={selectedSupplierId}
                            onSelect={handleSelect}
                            onQueryChange={handleQueryChange}
                            isSearching={isSearching}
                        />

                        <p className="text-[10px] text-slate-400 font-medium ml-1 mt-1">
                            O fornecedor será adicionado aos produtos sem substituir vínculos existentes.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedSupplierId || isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-widest shadow-md transition-all disabled:opacity-50 active:scale-95"
                    >
                        {isSubmitting ? (
                            <><i className="bi bi-arrow-repeat animate-spin"></i> Aplicando...</>
                        ) : (
                            <><i className="bi bi-check2"></i> Confirmar Atribuição</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Componente interno: input com busca live e dropdown ─────────────────────

interface SupplierSearchFieldProps {
    suppliers: Person[];
    selectedSupplierId: string;
    onSelect: (id: string) => void;
    onQueryChange: (term: string) => void;
    isSearching: boolean;
}

const SupplierSearchField: React.FC<SupplierSearchFieldProps> = ({
    suppliers,
    selectedSupplierId,
    onSelect,
    onQueryChange,
    isSearching,
}) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onSelect(''); // limpa seleção ao digitar

        if (debounceTimer) clearTimeout(debounceTimer);
        const timer = setTimeout(() => {
            onQueryChange(val);
            setOpen(val.trim().length >= 2);
        }, 350);
        setDebounceTimer(timer);
    };

    const handleClear = () => {
        setQuery('');
        onSelect('');
        setOpen(false);
    };

    const handleSelectItem = (supplier: Person) => {
        setQuery(supplier.fullName);
        onSelect(supplier.id!);
        setOpen(false);
    };

    // Se tiver selecionado externamente, sincroniza o texto
    React.useEffect(() => {
        if (selectedSupplier && query !== selectedSupplier.fullName) {
            setQuery(selectedSupplier.fullName);
        }
    }, [selectedSupplier]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="relative">
            <div className="relative">
                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                <input
                    type="text"
                    autoComplete="off"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => { if (query.trim().length >= 2 && suppliers.length > 0) setOpen(true); }}
                    onBlur={() => setTimeout(() => setOpen(false), 200)}
                    placeholder="Digite o nome do fornecedor..."
                    className="w-full h-11 pl-10 pr-9 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSearching && (
                        <i className="bi bi-arrow-repeat animate-spin text-slate-400 text-sm"></i>
                    )}
                    {selectedSupplierId && !isSearching && (
                        <>
                            <i className="bi bi-check-circle-fill text-emerald-500 text-sm"></i>
                            <button type="button" onClick={handleClear} className="text-slate-400 hover:text-red-500 transition-colors ml-1">
                                <i className="bi bi-x-lg text-xs"></i>
                            </button>
                        </>
                    )}
                    {!selectedSupplierId && !isSearching && (
                        <i className="bi bi-truck text-slate-400 text-sm"></i>
                    )}
                </div>
            </div>

            {/* Dropdown de resultados */}
            {open && (
                <div className="absolute z-[99999] top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                    {suppliers.length === 0 ? (
                        <div className="px-4 py-4 text-center text-xs font-bold text-slate-400">
                            {isSearching ? 'Buscando...' : 'Nenhum fornecedor encontrado.'}
                        </div>
                    ) : (
                        suppliers.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                onMouseDown={() => handleSelectItem(s)}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex flex-col gap-0.5"
                            >
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                    {s.fullName}
                                </span>
                                {s.tradeName && s.tradeName !== s.fullName && (
                                    <span className="text-[10px] text-slate-400 truncate">
                                        Fantasia: {s.tradeName}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
