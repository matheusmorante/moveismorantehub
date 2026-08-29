import { useMemo, useRef, useState } from 'react';
import { Product } from '@/pages/types/product.type';
import { Person } from '../../../../types/person.type';
import DropdownPortal from '@/components/shared/DropdownPortal';
import PersonFormModal from '../../../Registrations/shared/PersonFormModal';

type Props = { formData: Partial<Product>; suppliers: Person[]; onChange: (fields: Partial<Product>) => void; hasError?: boolean };
const MAX_SUPPLIERS = 3;

export function ProductSupplierField({ formData, suppliers, onChange, hasError = false }: Props) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);
    const selectedIds = useMemo(() => Array.from(new Set((formData.supplierIds?.length ? formData.supplierIds : [formData.mainSupplierId || formData.supplierId]).filter(Boolean))) as string[], [formData.supplierIds, formData.mainSupplierId, formData.supplierId]);
    const visibleSuppliers = suppliers.filter((supplier) => !selectedIds.includes(supplier.id || '') && supplier.fullName.toLowerCase().includes(search.toLowerCase()));

    const addSupplier = (supplier: Person) => {
        if (!supplier.id || selectedIds.length >= MAX_SUPPLIERS) return;
        const supplierIds = [...selectedIds, supplier.id];
        onChange({ supplierIds, mainSupplierId: supplierIds[0], supplierId: supplierIds[0], ipiPercent: supplier.defaultIpiPercent ?? formData.ipiPercent, freightCost: supplier.defaultFreightCost ?? formData.freightCost, freightType: supplier.defaultFreightType || formData.freightType });
        setSearch(''); setIsOpen(false);
    };
    const removeSupplier = (supplierId: string) => {
        const supplierIds = selectedIds.filter((id) => id !== supplierId);
        onChange({ supplierIds, mainSupplierId: supplierIds[0] || '', supplierId: supplierIds[0] || '' });
    };

    return <div id="field-main-supplier" className="relative flex flex-col gap-2 rounded-2xl p-2 md:col-span-2" ref={anchorRef}>
        <label className="flex h-6 items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>Fornecedores <span className="text-red-500">*</span></span><button type="button" onClick={() => setIsPersonFormOpen(true)} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline"><i className="bi bi-plus-lg" />Novo</button></label>
        <div className="flex gap-2"><div className="relative flex-1"><i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400" /><input type="text" value={search} onChange={(event) => { setSearch(event.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} placeholder="Pesquise um fornecedor..." className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:ring-2 dark:bg-slate-955 dark:text-slate-200 ${hasError ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:ring-blue-500/20 dark:border-slate-800'}`} /></div><button type="button" onClick={() => setIsOpen(true)} disabled={selectedIds.length >= MAX_SUPPLIERS} className="rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-40" title="Adicionar fornecedor"><i className="bi bi-plus-lg" /></button></div>
        {hasError && <span className="text-[9px] font-bold text-red-500">Adicione ao menos um fornecedor.</span>}
        <DropdownPortal anchorRef={anchorRef} isOpen={isOpen && visibleSuppliers.length > 0}><div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">{visibleSuppliers.map((supplier) => <button key={supplier.id} type="button" onClick={() => addSupplier(supplier)} className="w-full border-b border-slate-50 p-3 text-left text-xs font-black text-slate-800 hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800">{supplier.fullName}</button>)}</div></DropdownPortal>
        {selectedIds.length > 0 && <div className="flex flex-wrap gap-2 pt-1">{selectedIds.map((id) => { const supplier = suppliers.find((item) => item.id === id); return <span key={id} className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{supplier?.fullName || 'Fornecedor'}<button type="button" onClick={() => removeSupplier(id)} className="text-blue-500 hover:text-red-500" title="Remover fornecedor"><i className="bi bi-x-lg" /></button></span>; })}<span className="self-center text-[9px] font-bold text-slate-400">{selectedIds.length}/{MAX_SUPPLIERS}</span></div>}
        {isPersonFormOpen && <PersonFormModal isOpen={isPersonFormOpen} onClose={() => setIsPersonFormOpen(false)} onSuccess={(person) => { if (person?.id) addSupplier(person); setIsPersonFormOpen(false); }} collectionName="suppliers" title="Novo Fornecedor" />}
    </div>;
}
