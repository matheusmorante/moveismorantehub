import React, { useEffect, useMemo, useRef, useState } from 'react';
import Person from '@/pages/types/person.type';
import DropdownPortal from '@/components/shared/DropdownPortal';

export interface PurchaseSupplierFilterProps {
    readonly suppliers: readonly Person[];
    readonly selectedSupplierId: string;
    readonly onSelect: (supplierId: string) => void;
}

/**
 * Componente de filtro de fornecedores em pedidos de compra com busca reativa e dropdown flutuante seguro via portal.
 */
export const PurchaseSupplierFilter: React.FC<PurchaseSupplierFilterProps> = ({
    suppliers,
    selectedSupplierId,
    onSelect,
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const suggestions = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        if (!normalizedQuery) return suppliers;
        return suppliers.filter((supplier) =>
            [supplier.fullName, supplier.tradeName, supplier.cpfCnpj].some((value) =>
                value?.toLocaleLowerCase().includes(normalizedQuery)
            )
        );
    }, [query, suppliers]);

    return (
        <div ref={wrapperRef} className="relative flex-1 max-w-md">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" aria-hidden="true" />
            <input
                type="text"
                autoComplete="off"
                role="combobox"
                aria-expanded={isOpen && !selectedSupplier}
                aria-label="Buscar fornecedor"
                value={selectedSupplier ? '' : query}
                onFocus={() => setIsOpen(true)}
                onChange={(event) => {
                    onSelect('');
                    setQuery(event.target.value);
                    setIsOpen(true);
                }}
                placeholder="Buscar e selecionar fornecedor..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-slate-200"
            />
            {selectedSupplier && (
                <div className="absolute inset-y-1.5 left-11 right-1.5 flex items-center justify-between gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm">
                    <span className="truncate">
                        <i className="bi bi-truck mr-2" aria-hidden="true" />
                        {selectedSupplier.fullName}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            onSelect('');
                            setQuery('');
                        }}
                        className="rounded-md px-1 text-blue-100 hover:bg-blue-700 hover:text-white"
                        title="Limpar fornecedor"
                        aria-label="Limpar fornecedor selecionado"
                    >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </div>
            )}
            <DropdownPortal anchorRef={wrapperRef} isOpen={isOpen && !selectedSupplier}>
                <div
                    role="listbox"
                    aria-label="Sugestões de fornecedores"
                    className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 custom-scrollbar"
                >
                    {suggestions.length > 0 ? (
                        suggestions.map((supplier) => (
                            <button
                                key={supplier.id}
                                type="button"
                                role="option"
                                aria-selected={supplier.id === selectedSupplierId}
                                className="block w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => {
                                    onSelect(supplier.id || '');
                                    setQuery('');
                                    setIsOpen(false);
                                }}
                            >
                                <span className="block text-sm font-bold text-slate-700 dark:text-slate-100">
                                    {supplier.fullName}
                                </span>
                                {supplier.tradeName && (
                                    <span className="text-xs text-slate-400">{supplier.tradeName}</span>
                                )}
                            </button>
                        ))
                    ) : (
                        <p className="px-4 py-5 text-center text-sm text-slate-400">
                            Nenhum fornecedor encontrado.
                        </p>
                    )}
                </div>
            </DropdownPortal>
        </div>
    );
};

export default PurchaseSupplierFilter;
