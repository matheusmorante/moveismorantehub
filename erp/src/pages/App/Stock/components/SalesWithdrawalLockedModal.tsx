import InventoryMove from '@/pages/types/inventoryMove.type';

type Props = { move: InventoryMove | null; onClose: () => void; onOpenSale: (saleId: string) => void; };

export default function SalesWithdrawalLockedModal({ move, onClose, onOpenSale }: Props) {
    if (!move) return null;
    return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} /><div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20"><i className="bi bi-lock-fill text-lg" /></div><h2 className="mt-4 text-xl font-black text-slate-800 dark:text-white">Saída vinculada à venda</h2><p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Esta saída foi gerada por um pedido de venda. Para desfazer o lançamento, abra o pedido vinculado e use a ação “Estornar Saída”.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Fechar</button><button type="button" onClick={() => move.relatedEntityId && onOpenSale(move.relatedEntityId)} disabled={!move.relatedEntityId} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">Ver pedido de venda</button></div></div></div>;
}
