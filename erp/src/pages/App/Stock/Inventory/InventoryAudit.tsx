import React from "react";
import type { InventorySnapshotItem, InventoryAuditSession } from "./types/inventoryAudit.types";
import { ActionConfirmModal } from "./modals/ActionConfirmModal";
import { StatusBadge, AdjustmentBadge } from "./components/InventoryAuditBadges";
import { InventoryAuditContextMenu } from "./components/InventoryAuditContextMenu";
import { useInventoryAuditSessions } from "./hooks/useInventoryAuditSessions";

interface InventoryAuditProps {
    readonly onCopy: (items: readonly InventorySnapshotItem[]) => void;
    readonly onOpen: (session: InventoryAuditSession) => void;
}

export const InventoryAudit: React.FC<InventoryAuditProps> = ({ onCopy, onOpen }) => {
    const {
        sessions,
        loading,
        activeSession,
        menuPos,
        confirmAction,
        setConfirmAction,
        handleOpenMenu,
        closeMenu,
        deleteDraft,
        handleToggleAdjustments,
        periodDays,
        setPeriodDays,
        page,
        setPage,
        pageCount,
    } = useInventoryAuditSessions();

    if (loading) {
        return <div className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando inventários...</div>;
    }

    return (
        <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <i className="bi bi-calendar3 text-blue-500" />
                    Período
                    <select value={periodDays} onChange={event => setPeriodDays(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none dark:border-slate-700 dark:text-slate-200">
                        <option value={30}>Últimos 30 dias</option>
                        <option value={90}>Últimos 90 dias</option>
                        <option value={365}>Último ano</option>
                        <option value={0}>Todos os períodos</option>
                    </select>
                </label>
                <div className="flex items-center gap-2">
                    <button type="button" disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300" aria-label="Página anterior"><i className="bi bi-chevron-left" /></button>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Página {page} de {pageCount}</span>
                    <button type="button" disabled={page >= pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300" aria-label="Próxima página"><i className="bi bi-chevron-right" /></button>
                </div>
            </div>
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
                            <div className="flex flex-col gap-0.5 px-5 py-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-snug">
                                    {new Date(session.date).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {new Date(session.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
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

            <InventoryAuditContextMenu
                activeSession={activeSession}
                menuPos={menuPos}
                onClose={closeMenu}
                onOpen={onOpen}
                onCopy={onCopy}
                onDeleteDraft={deleteDraft}
                onConfirmReversal={(session, type) => setConfirmAction({ session, type })}
            />

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
