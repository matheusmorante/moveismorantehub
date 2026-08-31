import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import InventoryMove from "../../../types/inventoryMove.type";
import { deleteInventoryMove, subscribeToInventoryMoves } from "@/pages/utils/inventoryService";
import { toast } from "react-toastify";

export type InventorySnapshotItem = { productId: string; variationId?: string; name: string; systemStock: number; physicalCount: number };
export type InventoryAuditSession = {
    id: string;
    inventoryCode: string;
    date: string;
    status: 'in_progress' | 'completed';
    productsCount: number;
    adjustmentsCount: number;
    items: InventorySnapshotItem[];
    responsibleId?: string;
    responsibleName?: string;
    markerMoveId?: string;
};

interface InventoryAuditProps {
    onCopy: (items: InventorySnapshotItem[]) => void;
    onOpen: (session: InventoryAuditSession) => void;
}

const readSnapshot = (move: InventoryMove) => {
    try {
        const data = JSON.parse(move.observation || '{}');
        if (data.inventoryAudit && Array.isArray(data.items)) {
            return {
                items: data.items as InventorySnapshotItem[],
                status: (data.status || 'completed') as 'in_progress' | 'completed',
                inventoryCode: (data.inventoryCode || move.label?.replace('Inventário #', '') || '') as string,
                responsibleId: data.responsibleId as string | undefined,
                responsibleName: data.responsibleName as string | undefined,
            };
        }
    } catch { }
    return null;
};

const InventoryAudit: React.FC<InventoryAuditProps> = ({ onCopy, onOpen }) => {
    const [moves, setMoves] = useState<InventoryMove[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState<InventoryAuditSession | null>(null);
    const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

    useEffect(() => {
        if (!activeSession) return;
        const handleClose = () => {
            setActiveSession(null);
            setMenuPos(null);
        };
        window.addEventListener('scroll', handleClose, true);
        window.addEventListener('resize', handleClose);
        return () => {
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
        } catch (error) {
            console.error('Erro ao excluir contagem:', error);
            toast.error('Não foi possível excluir a contagem.');
        } finally {
            setActiveSession(null);
            setMenuPos(null);
        }
    };

    useEffect(() => subscribeToInventoryMoves((data) => { setMoves(data); setLoading(false); }), []);

    const sessions = useMemo(() => moves
        .filter((move) => move.label?.startsWith('Inventário #'))
        .map((marker): InventoryAuditSession | null => {
            const snapshot = readSnapshot(marker);
            if (!snapshot || !snapshot.items.length) return null;
            const adjustmentsCount = moves.filter((move) => move.relatedEntityId === marker.relatedEntityId && move.label?.startsWith('Ajuste lançado pelo inventário #')).length;
            return {
                id: marker.relatedEntityId || marker.id || marker.date,
                inventoryCode: snapshot.inventoryCode,
                date: marker.date,
                status: snapshot.status,
                items: snapshot.items,
                productsCount: snapshot.items.length,
                adjustmentsCount,
                responsibleId: snapshot.responsibleId,
                responsibleName: snapshot.responsibleName,
                markerMoveId: marker.id
            };
        })
        .filter((s): s is InventoryAuditSession => s !== null)
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()), [moves]);

    if (loading) return <div className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando inventários...</div>;

    return <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full border-collapse whitespace-nowrap text-left">
            <thead>
                <tr className="bg-slate-50 dark:bg-slate-955 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Inventário</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Data e horário</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Responsável</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Produtos contados</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Ajustes gerados</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {sessions.map((session) => (
                    <tr key={session.id} onClick={() => onOpen(session)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
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
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                session.status === 'in_progress'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'in_progress' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                {session.status === 'in_progress' ? 'Em andamento' : 'Concluído'}
                            </span>
                        </td>
                        <td className="px-8 py-5 text-center text-sm font-black text-slate-600 dark:text-slate-300">
                            {session.productsCount}
                        </td>
                        <td className="px-8 py-5">
                            <div className="flex items-center justify-center gap-2">
                                <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{session.adjustmentsCount}</strong>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${session.adjustmentsCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                    {session.status === 'in_progress' ? 'Pendente' : (session.adjustmentsCount > 0 ? 'Lançado' : 'Sem ajuste')}
                                </span>
                            </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                            <button
                                type="button"
                                onClick={(event) => handleOpenMenu(event, session)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Mais opções"
                            >
                                <i className="bi bi-three-dots-vertical" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {!sessions.length && <div className="p-20 text-center text-sm font-bold text-slate-400">Nenhum inventário registrado ainda.</div>}

        {activeSession && menuPos && typeof document !== 'undefined' && createPortal(
            <>
                <div 
                    className="fixed inset-0 z-[99998]" 
                    onClick={(e) => { e.stopPropagation(); setActiveSession(null); setMenuPos(null); }} 
                />
                <div 
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
                        onClick={(event) => {
                            event.stopPropagation();
                            const target = activeSession;
                            setActiveSession(null);
                            setMenuPos(null);
                            onOpen(target);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                    >
                        <i className={activeSession.status === 'in_progress' ? "bi bi-pencil-square" : "bi bi-eye"} />
                        {activeSession.status === 'in_progress' ? 'Continuar inventário' : 'Ver detalhes'}
                    </button>
                    <button
                        type="button"
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
                        <i className="bi bi-copy" />
                        Copiar inventário
                    </button>
                    {activeSession.status === 'in_progress' && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                const target = activeSession;
                                void deleteDraft(target);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        >
                            <i className="bi bi-trash" />
                            Excluir contagem
                        </button>
                    )}
                </div>
            </>,
            document.body
        )}
    </div>;
};

export default InventoryAudit;
