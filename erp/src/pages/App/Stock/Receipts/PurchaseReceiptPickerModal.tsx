import { useEffect, useState } from 'react';
import Purchase from '../../../types/purchase.type';
import { subscribeToPurchases } from '../../../utils/purchaseService';
import { formatCurrency } from '../../../utils/formatters';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import Person from '../../../types/person.type';

type Props = { isOpen: boolean; onClose: () => void; onSelect: (purchase: Purchase) => void };

export default function PurchaseReceiptPickerModal({ isOpen, onClose, onSelect }: Props) {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [supplierId, setSupplierId] = useState('');
    useEffect(() => isOpen ? subscribeToPurchases(setPurchases) : undefined, [isOpen]);
    useEffect(() => { if (isOpen) setSupplierId(''); }, [isOpen]);
    if (!isOpen) return null;
    const suppliers: Person[] = Array.from(new Map(purchases.filter((purchase) => purchase.status !== 'cancelled').map((purchase) => [purchase.supplierId, purchase.supplierName])).entries())
        .map(([id, fullName]) => ({ id, fullName, personType: 'PJ', type: 'suppliers', active: true }));
    const available = supplierId ? purchases.filter((purchase) => purchase.status !== 'cancelled' && purchase.supplierId === supplierId) : [];

    return <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <section className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <header className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><h3 className="text-lg font-black text-slate-800 dark:text-slate-100"><i className="bi bi-cart-check mr-2 text-blue-600" />Utilizar pedido de compra</h3><p className="mt-1 text-xs text-slate-500">Escolha o fornecedor para encontrar os pedidos feitos.</p></div><button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500"><i className="bi bi-x-lg" /></button></header>
            <div className="m-5 space-y-3"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"><i className="bi bi-exclamation-triangle-fill mr-2" />Use o pedido como ponto de partida e ajuste os itens caso haja diferença entre o pedido e o recebimento.</div>
                <SupplierAutocomplete suppliers={suppliers} selectedSupplierId={supplierId} onSelect={setSupplierId} placeholder="Pesquise e selecione o fornecedor..." inputClassName="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 dark:border-slate-700" />
            </div>
            <div className="max-h-[43vh] overflow-y-auto px-5 pb-5"><div className="space-y-2">{available.map((purchase) => <button key={purchase.id} type="button" onClick={() => { onSelect(purchase); onClose(); }} className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:border-blue-900"><div><p className="text-sm font-black text-slate-800 dark:text-slate-100">Pedido #{purchase.id?.slice(-6).toUpperCase()} · {purchase.supplierName}</p><p className="mt-1 text-xs font-medium text-slate-500">{purchase.items.length} item(ns) · {new Date(purchase.date).toLocaleDateString('pt-BR')}</p></div><span className="text-sm font-black text-blue-600">{formatCurrency(purchase.totalValue)}</span></button>)}{!available.length && <p className="py-10 text-center text-sm font-bold text-slate-400">{supplierId ? 'Nenhum pedido de compra encontrado para este fornecedor.' : 'Selecione um fornecedor para ver os pedidos.'}</p>}</div></div>
        </section>
    </div>;
}
