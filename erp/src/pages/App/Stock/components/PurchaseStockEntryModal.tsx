import { useEffect, useState } from 'react';
import Purchase from '@/pages/types/purchase.type';
import Product from '@/pages/types/product.type';
import { subscribeToProducts } from '@/pages/utils/productService';
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import { updatePurchase } from '@/pages/utils/purchaseService';
import { toast } from 'react-toastify';

type Props = { purchase: Purchase | null; isOpen: boolean; onClose: () => void; };

export default function PurchaseStockEntryModal({ purchase, isOpen, onClose }: Props) {
    const [products, setProducts] = useState<Product[]>([]);
    const [date, setDate] = useState('');
    const [observation, setObservation] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !purchase) return;
        setDate(purchase.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
        setObservation(`Pedido de Compra #${purchase.id?.slice(-4)}${purchase.invoiceNumber ? ` | NF: ${purchase.invoiceNumber}` : ''}${purchase.observation ? ` | ${purchase.observation}` : ''}`);
        return subscribeToProducts(data => setProducts(data.filter(product => !product.deleted)));
    }, [isOpen, purchase]);

    const handleSave = async () => {
        if (!purchase || !observation.trim()) return toast.error('Informe a observação da movimentação.');
        const missingProduct = purchase.items.find(item => !products.some(product => product.id === item.productId));
        if (missingProduct) return toast.error(`Produto não encontrado: ${missingProduct.description}.`);
        setIsSaving(true);
        try {
            for (const item of purchase.items) {
                const product = products.find(current => current.id === item.productId)!;
                const variation = product.variations?.find(current => current.id === item.variationId);
                await saveInventoryMove({
                    productId: item.productId,
                    variationId: item.variationId,
                    productDescription: item.description,
                    type: 'entry', quantity: item.quantity, date: new Date(`${date}T12:00:00`).toISOString(),
                    label: `Entrada a partir do Pedido #${purchase.purchaseNumber || purchase.id?.slice(-4)}`,
                    observation, unitCost: item.unitCost,
                    relatedEntityId: purchase.id, relatedEntityType: 'purchase_order'
                }, variation ? Number(variation.stock || 0) : Number(product.stock || 0));
            }
            if (purchase.id) await updatePurchase(purchase.id, { stockProcessed: true });
            toast.success('Movimentações de entrada registradas com sucesso!');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Não foi possível registrar as movimentações.');
        } finally { setIsSaving(false); }
    };

    if (!isOpen || !purchase) return null;
    return <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex items-center justify-center p-0 xl:inset-0 xl:z-50 xl:p-4"><div className="absolute inset-0 bg-slate-900/60" onClick={onClose} /><div className="relative flex h-full w-full flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-2xl xl:rounded-[2rem] xl:border xl:border-slate-100 xl:dark:border-slate-800"><header className="flex shrink-0 items-center justify-between bg-emerald-600 p-6 text-white"><div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Pedido #{purchase.purchaseNumber || purchase.id?.slice(-4)} · {purchase.supplierName}</p><h2 className="mt-1 text-xl font-black">Entrada a partir deste pedido</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><i className="bi bi-x-lg" /></button></header><div className="flex-1 space-y-5 overflow-y-auto p-6"><div className="grid grid-cols-3 gap-3"><button type="button" className="flex flex-col items-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 text-emerald-600 shadow-lg shadow-emerald-100 dark:bg-emerald-900/20"><i className="bi bi-plus-circle text-xl" /><span className="text-[9px] font-black uppercase tracking-widest">Entrada</span></button><button type="button" disabled className="flex cursor-not-allowed flex-col items-center gap-2 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-300 opacity-60 dark:border-slate-800 dark:bg-slate-900"><i className="bi bi-dash-circle text-xl" /><span className="text-[9px] font-black uppercase tracking-widest">Saída</span></button><button type="button" disabled className="flex cursor-not-allowed flex-col items-center gap-2 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-300 opacity-60 dark:border-slate-800 dark:bg-slate-900"><span className="text-xl leading-none">⚖</span><span className="text-[9px] font-black uppercase tracking-widest">Ajuste</span></button></div><div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800"><tr><th className="px-4 py-3">Produto</th><th className="px-4 py-3 text-right">Quantidade</th></tr></thead><tbody>{purchase.items.map(item => <tr key={`${item.productId}-${item.variationId || ''}`} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-100">{item.description}</td><td className="px-4 py-3 text-right font-black">{item.quantity}</td></tr>)}</tbody></table></div><div className="grid gap-4 sm:grid-cols-3"><label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Data<input type="date" value={date} onChange={event => setDate(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label><label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:col-span-2">Observação<textarea value={observation} onChange={event => setObservation(event.target.value)} rows={2} className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label></div><button type="button" disabled={isSaving} onClick={handleSave} className="w-full rounded-2xl bg-emerald-600 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">{isSaving ? 'Registrando...' : 'Confirmar movimentações de entrada'}</button></div></div></div>;
}
