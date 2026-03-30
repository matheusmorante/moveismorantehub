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
        const matchesSearch = m.productDescription.toLowerCase().includes(search.toLowerCase()) || 
                             m.label?.toLowerCase().includes(search.toLowerCase());
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
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                        type="text" 
                        placeholder="Buscar por produto ou rótulo..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-slate-200"
                    />
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Escanear Código de Barras"
                    >
                        <i className="bi bi-qr-code-scan"></i>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo:</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-slate-300 cursor-pointer"
                    >
                        <option value="all">Todos os Lançamentos</option>
                        <option value="entry">Entradas (+)</option>
                        <option value="withdrawal">Saídas (-)</option>
                        <option value="balance">Balanço (=)</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950">
                        <tr>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Data</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Produto</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Tipo</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Quantidade</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Rótulo</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Origem</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filtered.map((move) => (
                            <tr key={move.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group ${
                                move.status === 'cancelled' ? 'opacity-40 grayscale pointer-events-none' : ''
                            }`}>
                                <td className="px-4 md:px-8 py-3 md:py-5 text-xs font-medium text-slate-500 whitespace-nowrap">
                                    {formatDateTime(move.date)}
                                </td>
                                <td className="px-4 md:px-8 py-3 md:py-5">
                                    <span className="block font-bold text-slate-700 dark:text-slate-200">{move.productDescription}</span>
                                </td>
                                <td className="px-4 md:px-8 py-3 md:py-5 text-center">
                                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        move.status === 'cancelled' ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500' :
                                        move.type === 'entry' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 
                                        move.type === 'withdrawal' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20' : 
                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/20'
                                    }`}>
                                        {move.status === 'cancelled' ? 'Cancelado' : move.type === 'entry' ? 'Entrada' : move.type === 'withdrawal' ? 'Retirada' : 'Balanço'}
                                    </span>
                                </td>
                                <td className="px-4 md:px-8 py-3 md:py-5 text-center font-black text-slate-700 dark:text-slate-200">
                                    {move.type === 'withdrawal' ? '-' : move.type === 'entry' ? '+' : ''}{move.quantity}
                                </td>
                                <td className="px-4 md:px-8 py-3 md:py-5 text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                        {move.label || 'Manual'}
                                    </span>
                                </td>
                                <td className="px-4 md:px-8 py-3 md:py-5 text-center">
                                    {move.relatedEntityId ? (
                                        <div className="flex flex-col items-center">
                                            <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${
                                                move.relatedEntityType === 'sales_order' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                                {move.relatedEntityType === 'sales_order' ? originLabels.sales : originLabels.purchases}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500 mt-1">
                                                #{move.relatedEntityId.slice(-4)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{originLabels.adjustment}</span>
                                    )}
                                </td>
                                <td className="px-4 md:px-8 py-3 md:py-5 text-right">
                                    {(move.relatedEntityType !== 'sales_order' && move.status !== 'cancelled') && (
                                        <button 
                                            onClick={() => handleDelete(move.id!)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                            title="Excluir Lançamento"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    )}
                                    {move.relatedEntityType === 'sales_order' && (
                                        <span className="text-[9px] font-black text-slate-300 uppercase italic">Bloqueado</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <div className="p-20 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6">
                        <i className="bi bi-clock-history text-4xl"></i>
                    </div>
                    <h4 className="text-xl font-black text-slate-400">Nenhum lançamento no histórico</h4>
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
