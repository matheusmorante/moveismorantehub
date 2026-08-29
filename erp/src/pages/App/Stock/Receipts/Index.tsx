import { useEffect, useState } from 'react';
import { formatCurrency, formatToBRDate } from '../../../utils/formatters';
import { GoodsReceipt, subscribeToGoodsReceipts } from '../../../utils/goodsReceiptService';
import ReceiptFormModal from './ReceiptFormModal';

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => subscribeToGoodsReceipts(setReceipts), []);

    return <div className="flex flex-col">
        <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><i className="bi bi-box-seam" /></div>
                <div><h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Recebimentos de Mercadorias</h1><p className="text-xs text-slate-500">Registre apenas as mercadorias que chegaram fisicamente.</p></div>
            </div>
            <button type="button" onClick={() => setIsFormOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-700"><i className="bi bi-plus-lg mr-2" />Registrar recebimento</button>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left">
                <thead><tr className="bg-slate-50 dark:bg-slate-950/30"><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recebimento</th><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor</th><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">NF</th><th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total recebido</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{receipts.map((receipt) => <tr key={receipt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30"><td className="px-6 py-4"><p className="text-xs font-mono font-bold text-slate-500">#{receipt.id.slice(-6).toUpperCase()}</p><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{receipt.items.length} itens recebidos</p></td><td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">{receipt.supplierName}</td><td className="px-6 py-4 text-sm text-slate-500">{formatToBRDate(receipt.receivedAt)}</td><td className="px-6 py-4 text-sm text-slate-500">{receipt.invoiceNumber || 'Não informada'}</td><td className="px-6 py-4 text-right text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(receipt.totalValue)}</td></tr>)}</tbody>
            </table>
            {!receipts.length && <div className="p-12 text-center"><i className="bi bi-box2-heart text-3xl text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-400">Nenhuma mercadoria foi recebida ainda.</p><p className="mt-1 text-xs text-slate-400">Pedidos de compra não aparecem aqui até que o recebimento seja registrado.</p></div>}
        </section>

        <ReceiptFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>;
}
