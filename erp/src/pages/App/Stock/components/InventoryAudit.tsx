import React, { useEffect, useMemo, useState } from "react";
import InventoryMove from "../../../types/inventoryMove.type";
import { subscribeToInventoryMoves } from "@/pages/utils/inventoryService";
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
                inventoryCode: (data.inventoryCode || move.label?.replace('Inventário #', '') || '') as string
            };
        }
    } catch { }
    return null;
};

const InventoryAudit: React.FC<InventoryAuditProps> = ({ onCopy, onOpen }) => {
    const [moves, setMoves] = useState<InventoryMove[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
                markerMoveId: marker.id
            };
        })
        .filter((s): s is InventoryAuditSession => s !== null)
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()), [moves]);

    if (loading) return <div className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando inventários...</div>;

    return <div className="overflow-x-auto">
        <table className="w-full border-collapse whitespace-nowrap text-left">
            <thead>
                <tr className="bg-slate-50 dark:bg-slate-950">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Inventário</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Data e horário</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Produtos contados</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Ajustes gerados</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {sessions.map((session) => (
                    <tr key={session.id} onClick={() => onOpen(session)} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="px-8 py-5 text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                            Inventário #{session.inventoryCode || '---'}
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-200">
                            {new Date(session.date).toLocaleString('pt-BR')}
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
                        <td className="px-8 py-5 text-right relative">
                            <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); setOpenMenuId(openMenuId === session.id ? null : session.id); }}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Mais opções"
                            >
                                <i className="bi bi-three-dots-vertical" />
                            </button>
                            {openMenuId === session.id && (
                                <div className="absolute right-8 top-12 z-20 w-48 rounded-xl border border-slate-100 bg-white p-1.5 text-left shadow-xl dark:border-slate-800 dark:bg-slate-900">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setOpenMenuId(null);
                                            onOpen(session);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                    >
                                        <i className={session.status === 'in_progress' ? "bi bi-pencil-square" : "bi bi-eye"} />
                                        {session.status === 'in_progress' ? 'Continuar inventário' : 'Ver detalhes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setOpenMenuId(null);
                                            onCopy(session.items);
                                            toast.info('Novo inventário criado a partir da cópia. Confira os saldos atuais antes de salvar.');
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                    >
                                        <i className="bi bi-copy" />
                                        Copiar inventário
                                    </button>
                                </div>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {!sessions.length && <div className="p-20 text-center text-sm font-bold text-slate-400">Nenhum inventário registrado ainda.</div>}
    </div>;
};

export default InventoryAudit;
