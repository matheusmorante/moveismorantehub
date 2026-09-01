import Order from "../../../types/order.type";

type DeleteDraftActionButtonProps = {
    order: Order;
    onDelete: (id: string) => void;
    onCloseMenu: () => void;
};

const DeleteDraftActionButton = ({ order, onDelete, onCloseMenu }: DeleteDraftActionButtonProps) => {
    if (order.status !== "draft" || !order.id) return null;

    return (
        <>
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onDelete(order.id!);
                    onCloseMenu();
                }}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-rose-600 transition-all hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                title="Excluir rascunho permanentemente"
            >
                <i className="bi bi-trash3-fill text-lg" />
                <span className="text-[10px] font-black uppercase tracking-widest">Excluir rascunho</span>
            </button>
        </>
    );
};

export default DeleteDraftActionButton;
