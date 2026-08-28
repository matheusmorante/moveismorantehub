import { useEffect, useRef, useState } from 'react';
import { Product } from '@/pages/types/product.type';
import { Person } from '../../../../types/person.type';
import DropdownPortal from '@/components/shared/DropdownPortal';
import PersonFormModal from '../../../Registrations/shared/PersonFormModal';

interface ProductSupplierFieldProps {
    formData: Partial<Product>;
    suppliers: Person[];
    onChange: (fields: Partial<Product>) => void;
    hasError?: boolean;
}

export function ProductSupplierField({ formData, suppliers, onChange, hasError = false }: ProductSupplierFieldProps) {
    const [supplierSearch, setSupplierSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
    const inputRef = useRef<HTMLDivElement>(null);
    const selectedSupplierId = formData.mainSupplierId || formData.supplierId || '';

    useEffect(() => {
        if (!formData.mainSupplierId && formData.supplierId) {
            onChange({ mainSupplierId: formData.supplierId });
        }
    }, [formData.mainSupplierId, formData.supplierId, onChange]);

    useEffect(() => {
        const supplier = suppliers.find(item => item.id === selectedSupplierId);
        setSupplierSearch(supplier?.fullName || '');
    }, [selectedSupplierId, suppliers]);

    const filteredSuppliers = suppliers.filter(supplier =>
        (supplier.fullName || '').toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const selectSupplier = (supplier: Person) => {
        onChange({
            // Mantém os dois campos sincronizados durante a transição do ERP.
            mainSupplierId: supplier.id,
            supplierId: supplier.id,
            ipiPercent: supplier.defaultIpiPercent !== undefined ? supplier.defaultIpiPercent : formData.ipiPercent,
            freightCost: supplier.defaultFreightCost !== undefined ? supplier.defaultFreightCost : formData.freightCost,
            freightType: supplier.defaultFreightType || formData.freightType,
        });
        setSupplierSearch(supplier.fullName || '');
        setIsDropdownOpen(false);
    };

    return (
        <div id="field-main-supplier" className="md:col-span-2 flex flex-col gap-2 relative p-2 rounded-2xl" ref={inputRef}>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between h-6">
                <span>Fornecedor Principal <span className="text-red-500">*</span></span>
                <button
                    type="button"
                    onClick={() => setIsPersonFormOpen(true)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-black flex items-center gap-1 uppercase tracking-widest text-[9px] hover:underline"
                    title="Criar Novo Fornecedor"
                >
                    <i className="bi bi-plus-lg text-xs font-black"></i>
                    <span>Novo</span>
                </button>
            </label>

            <div className="relative">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                    type="text"
                    value={supplierSearch}
                    onChange={(event) => {
                        setSupplierSearch(event.target.value);
                        setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Digite o nome do fornecedor..."
                    className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-955 border rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 ${hasError ? 'border-red-500 text-red-600 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-800 focus:ring-blue-500/20'}`}
                />
            </div>
            {hasError && <span className="text-[9px] font-bold text-red-500">Selecione o fornecedor principal.</span>}

            <DropdownPortal anchorRef={inputRef} isOpen={isDropdownOpen && filteredSuppliers.length > 0}>
                <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredSuppliers.map(supplier => (
                        <button
                            key={supplier.id}
                            type="button"
                            onClick={() => selectSupplier(supplier)}
                            className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-b-0"
                        >
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">{supplier.fullName}</p>
                        </button>
                    ))}
                </div>
            </DropdownPortal>

            {isPersonFormOpen && (
                <PersonFormModal
                    isOpen={isPersonFormOpen}
                    onClose={() => setIsPersonFormOpen(false)}
                    onSuccess={(person) => {
                        if (person?.id) selectSupplier(person);
                        setIsPersonFormOpen(false);
                    }}
                    collectionName="suppliers"
                    title="Novo Fornecedor"
                />
            )}
        </div>
    );
}
