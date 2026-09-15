import Order from "../../types/order.type";

type ChangedItem = { before?: any; after?: any };

const itemKey = (item?: any) => `${item?.productId || ''}:${item?.variationId || ''}`;
const itemLabel = (item?: any) => item?.description || 'Item não informado';
const isCatalogItem = (item?: any) => Boolean(item?.productId && !item?.isTemporaryProduct);

export const getInventorySensitiveItemChanges = (before: Order, after: Order): ChangedItem[] => {
    const previousItems = before.items || [];
    const currentItems = after.items || [];
    const changes: ChangedItem[] = [];

    for (let index = 0; index < Math.max(previousItems.length, currentItems.length); index += 1) {
        const previous = previousItems[index];
        const current = currentItems[index];
        const productChanged = itemKey(previous) !== itemKey(current);
        const quantityChanged = Number(previous?.quantity || 0) !== Number(current?.quantity || 0);
        if ((productChanged || quantityChanged) && (isCatalogItem(previous) || isCatalogItem(current))) {
            changes.push({ before: previous, after: current });
        }
    }
    return changes;
};

const ItemMovementChangeConfirmModal = ({ changes, onCancel, onConfirm }: { changes: ChangedItem[]; onCancel: () => void; onConfirm: () => void }) => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onCancel}>
        <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl dark:border-amber-900/50 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-start gap-3 border-b border-amber-100 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/30">
                <i className="bi bi-exclamation-triangle-fill mt-0.5 text-xl text-amber-600" />
                <div><h2 className="text-base font-black text-slate-800 dark:text-slate-100">Você alterou itens deste pedido</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Confira as mudanças antes de salvar.</p></div>
            </header>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">
                {changes.map((change, index) => <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-2">
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Antes</p><p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{itemLabel(change.before)} · {change.before?.quantity ?? 0} un.</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Agora</p><p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{itemLabel(change.after)} · {change.after?.quantity ?? 0} un.</p></div>
                </div>)}
                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">A movimentação de saída vinculada ao item anterior será estornada. Em seguida, será gerada uma nova movimentação para o estado atual do item.</p>
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end dark:border-slate-800"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Voltar e revisar</button><button type="button" onClick={onConfirm} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700">Confirmar e salvar</button></footer>
        </section>
    </div>
);

export default ItemMovementChangeConfirmModal;
