import React, { useEffect } from 'react';
import type { InventoryAuditSession } from '../components/InventoryAudit';

export interface InventoryAuditDetailsModalProps {
    readonly session: InventoryAuditSession | null;
    readonly onClose: () => void;
}

/**
 * Modal detalhado exibindo as contagens físicas, saldos no momento do inventário e os ajustes gerados.
 */
export const InventoryAuditDetailsModal: React.FC<InventoryAuditDetailsModalProps> = ({
    session,
    onClose,
}) => {
    useEffect(() => {
        if (!session) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [session, onClose]);

    if (!session) return null;

    const differencesCount = session.items.filter(
        (item) => item.physicalCount !== null && item.physicalCount !== item.systemStock
    ).length;

    return (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do inventário"
            onClick={onClose}
        >
            <section
                className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-slide-up"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                            Detalhes do inventário
                        </h2>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                            {new Date(session.date).toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Fechar modal"
                    >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </header>

                <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-5 text-center dark:border-slate-800 sm:grid-cols-3">
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Itens contados
                        </span>
                        <strong className="text-lg text-slate-700 dark:text-slate-100">
                            {session.productsCount}
                        </strong>
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Ajustes gerados
                        </span>
                        <strong className="text-lg text-emerald-600">{session.adjustmentsCount}</strong>
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Diferenças
                        </span>
                        <strong className="text-lg text-slate-700 dark:text-slate-100">
                            {differencesCount}
                        </strong>
                    </div>
                </div>

                <div className="max-h-[55vh] overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-950">
                            <tr>
                                <th className="px-5 py-3">Produto / variação</th>
                                <th className="px-5 py-3 text-center">Saldo no momento</th>
                                <th className="px-5 py-3 text-center">Contagem física</th>
                                <th className="px-5 py-3 text-center">Ajuste</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {session.items.map((item, index) => {
                                const isCounted = item.physicalCount !== null;
                                const adjustment = isCounted ? item.physicalCount! - item.systemStock : 0;
                                return (
                                    <tr key={`${item.productId}-${item.variationId || index}`}>
                                        <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-200">
                                            {item.name}
                                        </td>
                                        <td className="px-5 py-4 text-center">{item.systemStock}</td>
                                        <td className="px-5 py-4 text-center font-black">
                                            {isCounted ? item.physicalCount : <span className="text-slate-400 font-normal italic">Não contado</span>}
                                        </td>
                                        <td
                                            className={`px-5 py-4 text-center font-black ${
                                                !isCounted
                                                    ? 'text-slate-300 dark:text-slate-700'
                                                    : adjustment > 0
                                                    ? 'text-emerald-600'
                                                    : adjustment < 0
                                                    ? 'text-rose-600'
                                                    : 'text-slate-400'
                                            }`}
                                        >
                                            {!isCounted ? '-' : adjustment > 0 ? `+${adjustment}` : adjustment}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default InventoryAuditDetailsModal;
