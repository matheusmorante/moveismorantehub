import React, { useState, useEffect } from "react";
import InventoryMove from "../../../types/inventoryMove.type";
import { subscribeToInventoryMoves, deleteInventoryMove } from '@/pages/utils/inventoryService';
import { formatDateTime } from "../../../utils/formatters";
import { getSettings } from '@/pages/utils/settingsService';
import { toast } from "react-toastify";
import QRScannerModal from "@/components/shared/QRScannerModal";

const InventoryMovesHistory = () => {
    const [moves, setMoves] = useState<InventoryMove[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<'all' | 'entry' | 'withdrawal' | 'balance'>('all');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const settings = getSettings();
    const { originLabels } = settings.inventoryAutomation;

    useEffect(() => {
        const unsubscribe = subscribeToInventoryMoves((data) => {
            setMoves(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filtered = moves.filter(m => {
        const desc = m.productDescription || "";
        const label = m.label || "";
        const matchesSearch = desc.toLowerCase().includes(search.toLowerCase()) || 
                             label.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || m.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este lançamento? Isso NÃO reverterá o estoque do produto.")) return;
        try {
            await deleteInventoryMove(id);
            toast.success("Lançamento excluído!");
        } catch (error) {
            toast.error("Erro ao excluir lançamento.");
        }
    };

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Histórico...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-35 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-lg">
                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input 
                        type="text" 
                        placeholder="Buscar por produto, lote ou rótulo..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-12 py-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/40 dark:border-slate-800/50 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-slate-200"
                    />
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                        title="Escanear Código de Barras"
                    >
                        <i className="bi bi-qr-code-scan"></i>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:inline">Tipo:</label>
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-955/80 backdrop-blur-sm rounded-2xl border border-slate-200/20">
                        {[
                            { id: 'all', label: 'Todos', icon: 'bi-grid-fill' },
                            { id: 'entry', label: 'Entradas', icon: 'bi-arrow-up-right-circle-fill' },
                            { id: 'withdrawal', label: 'Saídas', icon: 'bi-arrow-down-left-circle-fill' },
                            { id: 'balance', label: 'Balanço', icon: 'bi-dash-circle-fill' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setTypeFilter(tab.id as any)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    typeFilter === tab.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-900/50'
                                }`}
                            >
                                <i className={`bi ${tab.icon} text-sm`}></i>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filtered.length > 0 ? (
                <div className="overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar border border-slate-100 dark:border-slate-800/50 rounded-3xl m-6 mt-6">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-955/50 border-b border-slate-100 dark:border-slate-800/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto e Detalhes</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd.</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                            {filtered.map((move) => (
                                <tr key={move.id} className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-all group ${
                                    move.status === 'cancelled' ? 'opacity-40 grayscale pointer-events-none' : ''
                                }`}>
                                    <td className="px-6 py-4 text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                        {formatDateTime(move.date)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 max-w-xl">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                    {move.productDescription || 'Produto Desconhecido'}
                                                </span>
                                                {/* Badge de Rótulo / Origem */}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                    move.label === 'ESTOQUE INICIAL' 
                                                        ? 'bg-orange-50 text-orange-600 border border-orange-100/55 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30' 
                                                        : move.relatedEntityType === 'sales_order' 
                                                        ? 'bg-blue-50 text-blue-600 border border-blue-100/55 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' 
                                                        : move.relatedEntityType === 'purchase_order' 
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/55 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200/50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/55'
                                                }`}>
                                                    {move.label === 'ESTOQUE INICIAL' ? 'Saldo Inicial' : move.label || 'Manual'}
                                                </span>
                                                {move.relatedEntityId && (
                                                    <span className="text-[9px] font-black bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                                                        #{move.relatedEntityId.slice(-4)}
                                                    </span>
                                                )}
                                            </div>
                                            {move.observation && (
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                    <i className="bi bi-chat-left-text text-[9px] text-slate-400"></i>
                                                    {move.observation}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            move.status === 'cancelled' 
                                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500' 
                                                : move.type === 'entry' 
                                                ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-955/20 dark:text-emerald-400' 
                                                : move.type === 'withdrawal' 
                                                ? 'bg-rose-100/50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-400' 
                                                : 'bg-blue-100/50 text-blue-600 dark:bg-blue-955/20 dark:text-blue-400'
                                        }`}>
                                            {move.type === 'entry' ? (
                                                <><i className="bi bi-arrow-up-right-circle-fill text-xs"></i> Entrada</>
                                            ) : move.type === 'withdrawal' ? (
                                                <><i className="bi bi-arrow-down-left-circle-fill text-xs"></i> Saída</>
                                            ) : (
                                                <><i className="bi bi-dash-circle-fill text-xs"></i> Balanço</>
                                            )}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 font-black text-xs text-center ${
                                        move.type === 'entry' ? 'text-emerald-600 dark:text-emerald-400' :
                                        move.type === 'withdrawal' ? 'text-rose-600 dark:text-rose-400' :
                                        'text-blue-600 dark:text-blue-400'
                                    }`}>
                                        {move.type === 'withdrawal' ? '-' : move.type === 'entry' ? '+' : ''}{move.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {(move.relatedEntityType !== 'sales_order' && move.status !== 'cancelled') ? (
                                            <button 
                                                onClick={() => handleDelete(move.id!)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-955/10 rounded-xl transition-all"
                                                title="Excluir Lançamento"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        ) : move.relatedEntityType === 'sales_order' ? (
                                            <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest select-none">Bloqueado</span>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-20 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6">
                        <i className="bi bi-clock-history text-4xl"></i>
                    </div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum lançamento no histórico</h4>
                </div>
            )}
            <QRScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScan={(code) => {
                    setSearch(code);
                    setIsScannerOpen(false);
                }}
                title="Escanear Histórico"
            />
        </div>
    );
};

export default InventoryMovesHistory;
