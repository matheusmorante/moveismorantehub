import React from "react";
import { createPortal } from "react-dom";
import type { InventoryAuditSession, InventorySnapshotItem } from "../types/inventoryAudit.types";
import { toast } from "react-toastify";

interface Props {
    readonly activeSession: InventoryAuditSession | null;
    readonly menuPos: { top?: number; bottom?: number; right: number } | null;
    readonly onClose: () => void;
    readonly onOpen: (session: InventoryAuditSession) => void;
    readonly onCopy: (items: readonly InventorySnapshotItem[]) => void;
    readonly onDeleteDraft: (session: InventoryAuditSession) => void;
    readonly onConfirmReversal: (session: InventoryAuditSession, type: 'reverse' | 'apply') => void;
}

export const InventoryAuditContextMenu: React.FC<Props> = ({
    activeSession,
    menuPos,
    onClose,
    onOpen,
    onCopy,
    onDeleteDraft,
    onConfirmReversal,
}) => {
    if (!activeSession || !menuPos || typeof document === 'undefined') return null;

    return createPortal(
        <>
            <button
                type="button"
                aria-label="Fechar menu"
                className="fixed inset-0 z-[99998] cursor-default bg-transparent"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />
            <div
                role="menu"
                aria-label="Opções do inventário"
                className="fixed w-48 rounded-xl border border-slate-100 bg-white p-1.5 text-left shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-[99999] animate-in fade-in zoom-in-95 duration-100"
                style={{
                    top: menuPos.top !== undefined ? `${menuPos.top}px` : 'auto',
                    bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : 'auto',
                    right: `${menuPos.right}px`
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    role="menuitem"
                    onClick={(event) => {
                        event.stopPropagation();
                        onClose();
                        onOpen(activeSession);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                >
                    <i className={activeSession.status !== 'completed' ? "bi bi-pencil-square" : "bi bi-eye"} aria-hidden="true" />
                    {activeSession.status === 'pending' ? 'Retomar envio' : activeSession.status === 'in_progress' ? 'Continuar inventário' : 'Ver detalhes'}
                </button>
                <button
                    type="button"
                    role="menuitem"
                    onClick={(event) => {
                        event.stopPropagation();
                        const targetItems = activeSession.items;
                        onClose();
                        onCopy(targetItems);
                        toast.info('Novo inventário criado a partir da cópia. Confira os saldos atuais antes de salvar.');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                >
                    <i className="bi bi-copy" aria-hidden="true" />
                    Duplicar inventário
                </button>
                {activeSession.status === 'in_progress' && (
                    <button
                        type="button"
                        role="menuitem"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDeleteDraft(activeSession);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                        <i className="bi bi-trash" aria-hidden="true" />
                        Excluir contagem
                    </button>
                )}
                {activeSession.status === 'completed' && activeSession.adjustmentsCount > 0 && activeSession.reversedCount === 0 && (
                    <button
                        type="button"
                        role="menuitem"
                        onClick={(event) => {
                            event.stopPropagation();
                            onClose();
                            onConfirmReversal(activeSession, 'reverse');
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                        <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                        Desfazer inventário
                    </button>
                )}
                {activeSession.status === 'completed' && activeSession.reversedCount > 0 && (
                    <button
                        type="button"
                        role="menuitem"
                        onClick={(event) => {
                            event.stopPropagation();
                            onClose();
                            onConfirmReversal(activeSession, 'apply');
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                    >
                        <i className="bi bi-check-all" aria-hidden="true" />
                        Aplicar ajuste
                    </button>
                )}
            </div>
        </>,
        document.body
    );
};
