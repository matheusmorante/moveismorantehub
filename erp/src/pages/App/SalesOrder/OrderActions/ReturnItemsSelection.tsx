import Order from "../../../types/order.type";

type Props = { order: Order; quantities: Record<string, number>; onToggle: (id: string, quantity: number) => void; onQuantityChange: (id: string, quantity: number, max: number) => void };

const ReturnItemsSelection = ({ order, quantities, onToggle, onQuantityChange }: Props) => {
    const hasUnregistered = (order.items || []).some(item => !item.productId?.trim() || item.isTemporaryProduct);

    return <div>
        <span className="mb-4 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Itens do pedido</span>
        <div className="space-y-3">{order.items.map((item, index) => {
            const itemId = item.productId || item.description;
            const selected = Boolean(quantities[itemId]);
            const isUnregistered = !item.productId?.trim() || item.isTemporaryProduct;

            return <div key={`${itemId}-${index}`} className={`flex flex-col rounded-3xl border p-4 transition-all ${selected ? "border-amber-200 bg-amber-50/50 shadow-premium-sm dark:border-amber-900/40 dark:bg-amber-900/10" : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-800"}`}>
                <div className="flex items-center justify-between gap-4">
                    <button type="button" onClick={() => onToggle(itemId, item.quantity)} className="flex flex-1 items-center gap-3 text-left outline-none">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 ${selected ? "border-amber-500 bg-amber-500 text-white" : "border-slate-200 dark:border-slate-700"}`}>{selected && <i className="bi bi-check-lg text-xs" />}</div>
                        <div>
                            <span className={`text-[11px] font-black uppercase leading-tight ${selected ? "text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-slate-200"}`}>{item.description}</span>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                <span>Total original: {item.quantity} un</span>
                                {isUnregistered && <span className="text-amber-600 dark:text-amber-400"> • Sem cadastro (não movimenta estoque)</span>}
                            </div>
                        </div>
                    </button>
                    <strong className={`text-xs ${selected ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>R$ {((selected ? quantities[itemId] : item.quantity) * item.unitPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                </div>
                {selected && <div className="mt-4 flex items-center justify-between gap-4 border-t border-amber-200/50 pt-4"><span className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">Quantidade a devolver</span><div className="flex items-center gap-1 rounded-2xl border border-amber-100 bg-white p-1 dark:border-amber-900/40 dark:bg-slate-950"><button type="button" onClick={() => onQuantityChange(itemId, quantities[itemId] - 1, item.quantity)} className="h-8 w-8 rounded-xl text-slate-600 hover:bg-amber-100"><i className="bi bi-dash-lg" /></button><input type="number" value={quantities[itemId]} onChange={(event) => onQuantityChange(itemId, parseInt(event.target.value) || 1, item.quantity)} className="w-12 bg-transparent text-center text-sm font-black outline-none" /><button type="button" onClick={() => onQuantityChange(itemId, quantities[itemId] + 1, item.quantity)} className="h-8 w-8 rounded-xl text-slate-600 hover:bg-amber-100"><i className="bi bi-plus-lg" /></button></div></div>}
            </div>;
        })}</div>
        {hasUnregistered && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] font-medium text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                <i className="bi bi-info-circle-fill mr-1.5" />
                Produtos sem cadastro no sistema <strong>não movimentam estoque</strong> ao gerar ou atender a devolução.
            </p>
        )}
    </div>;
};

export default ReturnItemsSelection;
