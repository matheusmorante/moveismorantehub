import React, { useEffect, useMemo, useState } from "react";
import type InventoryMove from "@/pages/types/inventoryMove.type";
import { createPortal } from "react-dom";
import { deleteInventoryMove, subscribeToInventoryMoves, reverseInventoryMove, unreverseInventoryMove } from "@/pages/utils/inventoryService";
import { toast } from "react-toastify";
import type { InventorySnapshotItem, InventoryAuditSession } from "./types/inventoryAudit.types";
import { readSnapshot } from "./utils/inventorySnapshotUtils";
import { ActionConfirmModal } from "./modals/ActionConfirmModal";

interface InventoryAuditProps {
    readonly onCopy: (items: readonly InventorySnapshotItem[]) => void;
    readonly onOpen: (session: InventoryAuditSession) => void;
}



export const InventoryAudit: React.FC<InventoryAuditProps> = ({ onCopy, onOpen }) => {
    const [moves, setMoves] = useState<InventoryMove[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState<InventoryAuditSession | null>(null);
    const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ session: InventoryAuditSession; type: 'reverse' | 'apply' } | null>(null);

    useEffect(() => {
        if (!activeSession) return;
        const handleClose = () => {
            setActiveSession(null);
            setMenuPos(null);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleClose, true);
        window.addEventListener('resize', handleClose);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleClose, true);
            window.removeEventListener('resize', handleClose);
        };
    }, [activeSession]);

    const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>, session: InventoryAuditSession) => {
        e.stopPropagation();
        if (activeSession?.id === session.id) {
            setActiveSession(null);
            setMenuPos(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 180) {
            setMenuPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
        } else {
            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }
        setActiveSession(session);
    };

    const deleteDraft = async (session: InventoryAuditSession) => {
        if (!session.markerMoveId || !window.confirm(`Excluir a contagem #${session.inventoryCode}?`)) return;
        try {
            await deleteInventoryMove(session.markerMoveId, false, true);
            toast.success('Contagem em andamento excluída.');
        } catch (error: unknown) {
            console.error('Erro ao excluir contagem:', error);
            toast.error('Não foi possível excluir a contagem.');
        } finally {
            setActiveSession(null);
            setMenuPos(null);
        }
    };

    const handleToggleAdjustments = async () => {
        if (!confirmAction) return;
        const { session, type } = confirmAction;
        
        try {
            const auditMoves = moves.filter((move) => move.relatedEntityId === session.id && move.label?.startsWith('Ajuste lançado pelo inventário #'));
            
            for (const move of auditMoves) {
                if (type === 'reverse' && move.status !== 'reversed') {
                    await reverseInventoryMove(move.id!, 'Estorno de inventário');
                } else if (type === 'apply' && move.status === 'reversed') {
                    await unreverseInventoryMove(move.id!);
                }
            }
            toast.success(type === 'reverse' ? 'Inventário estornado com sucesso!' : 'Ajustes aplicados com sucesso!');
        } catch (error) {
            console.error('Erro ao processar movimentações:', error);
            toast.error('Ocorreu um erro ao processar sua solicitação.');
        } finally {
            setConfirmAction(null);
        }
    };

    useEffect(() => {
        return subscribeToInventoryMoves((data) => {
            setMoves(data);
            setLoading(false);
        });
    }, []);

    const sessions = useMemo(() => moves
        .filter((move) => move.label?.startsWith('Inventário #'))
        .map((marker): InventoryAuditSession | null => {
            const snapshot = readSnapshot(marker);
            if (!snapshot || !snapshot.items.length) return null;
            const auditMoves = moves.filter((move) => move.relatedEntityId === marker.relatedEntityId && move.label?.startsWith('Ajuste lançado pelo inventário #'));
            const adjustmentsCount = auditMoves.length;
            const reversedCount = auditMoves.filter(m => m.status === 'reversed').length;
            
            return {
                id: marker.relatedEntityId || marker.id || marker.date,
                inventoryCode: snapshot.inventoryCode,
                date: marker.date,
                status: snapshot.status,
                items: snapshot.items,
                productsCount: snapshot.items.length,
                adjustmentsCount,
                reversedCount,
                blindCount: snapshot.blindCount,
                hasStages: snapshot.hasStages,
                responsibleId: snapshot.responsibleId,
                responsibleName: snapshot.responsibleName,
                markerMoveId: marker.id
            };
        })
        .filter((s): s is InventoryAuditSession => s !== null)
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()), [moves]);

    if (loading) {
        return <div className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando inventários...</div>;
    }

    const StatusBadge = ({ status }: { status: InventoryAuditSession['status'] }) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
            status === 'in_progress'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'in_progress' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {status === 'in_progress' ? 'Em andamento' : 'Concluído'}
        </span>
    );

    const AdjustmentBadge = ({ session }: { session: InventoryAuditSession }) => (
        <div className="flex items-center gap-1.5">
            <strong className={`text-sm font-black ${session.reversedCount > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{session.adjustmentsCount}</strong>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                session.reversedCount > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' :
                session.adjustmentsCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}>
                {session.status === 'in_progress' ? 'Pendente' : (session.reversedCount > 0 ? 'Estornado' : session.adjustmentsCount > 0 ? 'Lançado' : 'Sem ajuste')}
            </span>
        </div>
    );

    const ContextMenu = () => activeSession && menuPos && typeof document !== 'undefined' ? createPortal(
        <>
            <button
                type="button"
                aria-label="Fechar menu"
                className="fixed inset-0 z-[99998] cursor-default bg-transparent"
                onClick={(e) => {
                    e.stopPropagation();
                    setActiveSession(null);
                    setMenuPos(null);
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
                        const target = activeSession;
                        setActiveSession(null);
                        setMenuPos(null);
                        onOpen(target);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                >
                    <i className={activeSession.status === 'in_progress' ? "bi bi-pencil-square" : "bi bi-eye"} aria-hidden="true" />
                    {activeSession.status === 'in_progress' ? 'Continuar inventário' : 'Ver detalhes'}
                </button>
                <button
                    type="button"
                    role="menuitem"
                    onClick={(event) => {
                        event.stopPropagation();
                        const targetItems = activeSession.items;
                        setActiveSession(null);
                        setMenuPos(null);
                        onCopy(targetItems);
                        toast.info('Novo inventário criado a partir da cópia. Confira os saldos atuais antes de salvar.');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                >
                    <i className="bi bi-copy" aria-hidden="true" />
                    Copiar inventário
                </button>
                {activeSession.status === 'in_progress' && (
                    <button
                        type="button"
                        role="menuitem"
                        onClick={(event) => {
                            event.stopPropagation();
                            const target = activeSession;
                            void deleteDraft(target);
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
                            setConfirmAction({ session: activeSession, type: 'reverse' });
                            setActiveSession(null);
                            setMenuPos(null);
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
                            setConfirmAction({ session: activeSession, type: 'apply' });
                            setActiveSession(null);
                            setMenuPos(null);
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
    ) : null;

    return (
        <>
            {/* ── Cards: telas menores que xl ── */}
            <div className="xl:hidden flex flex-col gap-3">
                {!sessions.length && (
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm font-bold text-slate-400">
                        Nenhum inventário registrado ainda.
                    </div>
                )}
                {sessions.map((session) => (
                    <button
                        key={session.id}
                        type="button"
                        onClick={() => onOpen(session)}
                        className="group w-full text-left rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/60 transition-all duration-200 overflow-hidden cursor-pointer"
                    >
                        {/* Cabeçalho do card */}
                        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-50 dark:border-slate-800/60">
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    Inventário
                                </span>
                                <span className="text-base font-black text-slate-800 dark:text-slate-100 font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    #{session.inventoryCode || '---'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                <StatusBadge status={session.status} />
                                <button
                                    type="button"
                                    onClick={(e) => handleOpenMenu(e, session)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Mais opções"
                                    aria-label="Mais opções"
                                    aria-haspopup="true"
                                    aria-expanded={activeSession?.id === session.id}
                                >
                                    <i className="bi bi-three-dots-vertical text-sm" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {/* Corpo do card: grade de métricas */}
                        <div className="grid grid-cols-2 gap-0 divide-x divide-slate-50 dark:divide-slate-800/60">
                            {/* Data */}
                            <div className="flex flex-col gap-0.5 px-5 py-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-snug">
                                    {new Date(session.date).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {new Date(session.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {/* Responsável */}
                            <div className="flex flex-col gap-0.5 px-5 py-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Responsável</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate leading-snug">
                                    {session.responsibleName || 'Não informado'}
                                </span>
                            </div>
                        </div>

                        {/* Rodapé: contadores */}
                        <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100 dark:divide-slate-800/60 border-t border-slate-50 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                            <div className="flex flex-col gap-0.5 px-5 py-3.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produtos contados</span>
                                <span className="text-lg font-black text-slate-700 dark:text-slate-200">{session.productsCount}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 px-5 py-3.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ajustes gerados</span>
                                <AdjustmentBadge session={session} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── Tabela: telas xl+ ── */}
            <div className="hidden xl:block bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full border-collapse whitespace-nowrap text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800">
                            <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Inventário</th>
                            <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Data e horário</th>
                            <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Responsável</th>
                            <th scope="col" className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th scope="col" className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Produtos contados</th>
                            <th scope="col" className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Ajustes gerados</th>
                            <th scope="col" className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                        {sessions.map((session) => (
                            <tr
                                key={session.id}
                                onClick={() => onOpen(session)}
                                className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                            >
                                <td className="px-8 py-5 text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                                    Inventário #{session.inventoryCode || '---'}
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {new Date(session.date).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {session.responsibleName || 'Não informado'}
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <StatusBadge status={session.status} />
                                </td>
                                <td className="px-8 py-5 text-center text-sm font-black text-slate-600 dark:text-slate-300">
                                    {session.productsCount}
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center justify-center gap-2">
                                        <AdjustmentBadge session={session} />
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button
                                        type="button"
                                        onClick={(event) => handleOpenMenu(event, session)}
                                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        title="Mais opções"
                                        aria-label="Mais opções"
                                        aria-haspopup="true"
                                        aria-expanded={activeSession?.id === session.id}
                                    >
                                        <i className="bi bi-three-dots-vertical" aria-hidden="true" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!sessions.length && <div className="p-20 text-center text-sm font-bold text-slate-400">Nenhum inventário registrado ainda.</div>}
            </div>

            <ContextMenu />

            <ActionConfirmModal 
                isOpen={!!confirmAction}
                actionType={confirmAction?.type ?? null}
                inventoryCode={confirmAction?.session.inventoryCode || ''}
                onConfirm={handleToggleAdjustments}
                onCancel={() => setConfirmAction(null)}
            />
        </>
    );
};

export default InventoryAudit;

