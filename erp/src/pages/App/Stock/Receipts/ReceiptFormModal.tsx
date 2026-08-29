import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import { PurchaseItemsSection } from '@/components/PurchaseItemsSection';
import Person from '../../../types/person.type';
import { PurchaseItem } from '../../../types/purchase.type';
import { formatCurrency } from '../../../utils/formatters';
import { subscribeToPeople } from '../../../utils/personService';
import { saveGoodsReceipt } from '../../../utils/goodsReceiptService';

type Props = { isOpen: boolean; onClose: () => void };

const calculateItems = (items: PurchaseItem[], ipi: number, freight: number) => items.map((item) => {
    const baseCost = item.baseCost || item.unitCost;
    const unitCost = baseCost * (1 + ipi / 100 + freight / 100);
    return { ...item, baseCost, unitCost: Number(unitCost.toFixed(2)), totalCost: Number((item.quantity * unitCost).toFixed(2)) };
});

export default function ReceiptFormModal({ isOpen, onClose }: Props) {
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [ipiPercent, setIpiPercent] = useState(0);
    const [freightPercent, setFreightPercent] = useState(0);
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setSupplierId(''); setItems([]); setIpiPercent(0); setFreightPercent(0);
        setReceiptDate(new Date().toISOString().slice(0, 10));
        return subscribeToPeople('suppliers', (data) => setSuppliers(data.filter((person) => !person.deleted && person.type === 'suppliers')));
    }, [isOpen]);

    if (!isOpen) return null;
    const supplier = suppliers.find((person) => person.id === supplierId);
    const processedItems = calculateItems(items, ipiPercent, freightPercent);
    const totalValue = processedItems.reduce((sum, item) => sum + item.totalCost, 0);

    const save = async () => {
        if (!supplier || !items.length) return toast.error('Selecione o fornecedor e adicione pelo menos um item.');
        setIsSaving(true);
        try {
            await saveGoodsReceipt({ supplierName: supplier.fullName, receivedAt: new Date(`${receiptDate}T12:00:00`).toISOString(), items: processedItems, totalValue });
            toast.success('Recebimento de mercadorias registrado!');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Não foi possível registrar o recebimento.');
        } finally { setIsSaving(false); }
    };

    const content = <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 xl:p-6">
        <button aria-label="Fechar" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <section className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-7xl xl:rounded-[2.5rem]">
            <header className="flex shrink-0 items-center justify-between bg-emerald-600 px-5 py-2.5 text-white xl:px-8 xl:py-3"><h2 className="text-lg font-black uppercase">Registrar recebimento</h2><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><i className="bi bi-x-lg text-lg" /></button></header>
            <div className="flex-1 space-y-7 overflow-y-auto p-5 xl:p-8">
                <div className="grid grid-cols-1 items-end gap-5 md:grid-cols-5"><div className="md:col-span-2"><SupplierAutocomplete suppliers={suppliers} selectedSupplierId={supplierId} onSelect={setSupplierId} disabled={items.length > 0} disabledReason="Remova os itens para alterar o fornecedor." placeholder="Selecione o fornecedor que entregou" /></div><label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Data do recebimento<input type="date" value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} className="border-b-2 border-slate-200 bg-transparent p-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200" /></label><NumberField label="IPI (%)" value={ipiPercent} onChange={setIpiPercent} /><NumberField label="Frete (%)" value={freightPercent} onChange={setFreightPercent} /></div>
                <PurchaseItemsSection items={items} onAddItem={(item) => setItems((current) => [...current, item])} onRemoveItem={(index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} ipiPercent={ipiPercent} freightPercent={freightPercent} formatCurrency={formatCurrency} supplierId={supplierId} onSupplierAutoSelect={setSupplierId} />
            </div>
            <footer className="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row xl:px-8"><p className="text-sm font-black text-slate-700 dark:text-slate-100">Total final: <span className="text-emerald-600">{formatCurrency(totalValue)}</span></p><div className="flex w-full gap-3 sm:w-auto"><button type="button" onClick={onClose} className="flex-1 rounded-2xl px-5 py-3 text-xs font-black uppercase text-slate-500">Cancelar</button><button type="button" disabled={isSaving} onClick={save} className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase text-white disabled:opacity-50">{isSaving ? 'Registrando...' : 'Registrar recebimento'}</button></div></footer>
        </section>
    </div>;
    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}<input type="number" min="0" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value)))} className="border-b-2 border-slate-200 bg-transparent p-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200" placeholder="0" /></label>;
}
