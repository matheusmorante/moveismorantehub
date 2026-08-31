import React from "react";
import { createPortal } from "react-dom";
import { Package, PackageCheck } from "lucide-react";

type Props = { orderType?: string; hasMovement: boolean };

const InventoryMovementBadge = ({ orderType, hasMovement }: Props) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const isReturn = orderType === 'return';
    const title = isReturn
        ? (hasMovement ? 'Entrada de estoque registrada pela devolução' : 'Entrada de estoque ainda não registrada')
        : (hasMovement ? 'Saída de estoque registrada pela venda' : 'Saída de estoque ainda não registrada');
    const explanation = isReturn
        ? (hasMovement
            ? 'Esta devolução possui uma entrada de estoque vinculada e efetiva. A entrada foi criada quando a devolução foi atendida.'
            : 'Ainda não há entrada de estoque vinculada a esta devolução. O selo só ficará verde depois que uma entrada real for registrada para os itens devolvidos.')
        : (hasMovement
            ? 'Este pedido possui uma saída de estoque vinculada e efetiva para os itens vendidos.'
            : 'Ainda não há saída de estoque vinculada a este pedido. Alterar o status do pedido, por si só, não deixa este selo verde.');

    return <>
        <button
            type="button"
            onMouseEnter={() => setIsOpen(true)}
            onClick={(event) => { event.stopPropagation(); setIsOpen(true); }}
            className={`flex h-6 w-6 items-center justify-center rounded-md border shadow-sm ${hasMovement ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'border-slate-200/80 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500'}`}
            title={title}
            aria-label={title}
        >
            {hasMovement ? <PackageCheck className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
        </button>

        {isOpen && createPortal(<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
            <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={event => event.stopPropagation()}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${hasMovement ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {hasMovement ? <PackageCheck className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{isReturn ? 'Entrada por devolução' : 'Saída da venda'}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{explanation}</p>
                <button type="button" onClick={() => setIsOpen(false)} className="mt-6 w-full rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">Entendi</button>
            </div>
        </div>, document.body)}
    </>;
};

export default InventoryMovementBadge;
