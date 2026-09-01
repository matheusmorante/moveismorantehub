import React from "react";
import { Package, PackageCheck } from "lucide-react";

type Props = { orderType?: string; hasMovement: boolean };

const InventoryMovementBadge = ({ orderType, hasMovement }: Props) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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

    const clearOpenTimer = () => {
        if (!openTimerRef.current) return;
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
    };

    const scheduleOpen = () => {
        clearOpenTimer();
        openTimerRef.current = setTimeout(() => setIsOpen(true), 500);
    };

    const close = () => {
        clearOpenTimer();
        setIsOpen(false);
    };

    React.useEffect(() => () => clearOpenTimer(), []);

    return <div className="relative inline-flex" onMouseEnter={scheduleOpen} onMouseLeave={close}>
        <button
            type="button"
            onFocus={scheduleOpen}
            onBlur={close}
            onClick={(event) => { event.stopPropagation(); clearOpenTimer(); setIsOpen(current => !current); }}
            className={`flex h-6 w-6 items-center justify-center rounded-md border shadow-sm ${hasMovement ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'border-slate-200/80 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500'}`}
            title={title}
            aria-label={title}
        >
            {hasMovement ? <PackageCheck className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
        </button>

        {isOpen && (
            <div role="tooltip" className="absolute left-full top-1/2 z-[300] ml-3 w-80 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${hasMovement ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {hasMovement ? <PackageCheck className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                    </div>
                    <div>
                        <h2 className="text-xs font-black text-slate-900 dark:text-white">{isReturn ? 'Entrada por devolução' : 'Saída da venda'}</h2>
                        <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{explanation}</p>
                    </div>
                </div>
            </div>
        )}
    </div>;
};

export default InventoryMovementBadge;
