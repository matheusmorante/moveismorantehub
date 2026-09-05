import React, { useState, useEffect } from "react";
import { financeService } from '@/pages/services/financeService';
import { AccountReceivable } from "../../../types/finance.type";
import { normalizeSearchTerm } from "@/pages/utils/textUtils";
import ReceivableModal from "./ReceivableModal";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatToBRDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
};

export default function Receivables() {
    const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReceivable, setSelectedReceivable] = useState<AccountReceivable | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchReceivables = async () => {
        setLoading(true);
        try {
            const data = await financeService.getReceivables(statusFilter !== "all" ? statusFilter : undefined);
            setReceivables(data || []);
        } catch (error) {
            console.error("Erro ao buscar contas a receber:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceivables();
    }, [statusFilter]);

    const handleEdit = (receivable: AccountReceivable) => {
        setSelectedReceivable(receivable);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setSelectedReceivable(null);
        setIsModalOpen(true);
    };

    const handleModalClose = (saved: boolean) => {
        setIsModalOpen(false);
        if (saved) fetchReceivables();
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20';
            case 'pending': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/20';
            case 'overdue': return 'bg-rose-100 text-rose-600 dark:bg-rose-900/20';
            case 'cancelled': return 'bg-slate-100 text-slate-600 dark:bg-slate-800';
            default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'paid': return 'Recebido';
            case 'pending': return 'Pendente';
            case 'overdue': return 'Atrasado';
            case 'cancelled': return 'Cancelada';
            default: return status;
        }
    };

    const normSearch = normalizeSearchTerm(search);
    const filtered = receivables.filter(r => 
        normalizeSearchTerm(r.description || '').includes(normSearch) || 
        normalizeSearchTerm(r.customer_name || '').includes(normSearch)
    );

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-10">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-6">
                    <div className="flex items-start xl:items-center gap-4 xl:gap-6">
                        <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-200 dark:shadow-none">
                            <i className="bi bi-file-earmark-plus text-2xl xl:text-3xl"></i>
                        </div>
                        <div>
                            <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                Contas a Receber
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                                Previsão de entradas, crediários e parcelamentos.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleNew}
                            className="flex items-center justify-center gap-2 xl:gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 xl:px-8 xl:py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto"
                        >
                            <i className="bi bi-plus-lg text-sm xl:text-base" />
                            Novo Recebimento
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all flex-col flex h-full">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input 
                                type="text" 
                                placeholder="Buscar por descrição ou cliente..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-slate-200"
                            />
                        </div>
                        <div className="flex gap-2 border border-slate-100 dark:border-slate-800 p-1 rounded-xl bg-slate-50 dark:bg-slate-950">
                            {[
                              { id: 'all', label: 'Todas' },
                              { id: 'pending', label: 'Pendentes' },
                              { id: 'overdue', label: 'Atrasadas' },
                              { id: 'paid', label: 'Recebidas' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                        statusFilter === filter.id 
                                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-950/20">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">Cód.</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">Vencimento</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">Descrição / Cliente</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">Valor Receber</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filtered.map((receivable) => (
                                    <tr key={receivable.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                        <td className="px-8 py-5 text-xs font-mono font-bold text-slate-400">
                                            #{receivable.id?.slice(0, 8)}
                                        </td>
                                        <td className="px-8 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatToBRDate(receivable.due_date)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="block font-bold text-slate-700 dark:text-slate-200">{receivable.description}</span>
                                            {receivable.customer_name && (
                                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                                                <i className="bi bi-person"></i> {receivable.customer_name}
                                              </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusStyle(receivable.status)}`}>
                                                {getStatusText(receivable.status)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-slate-700 dark:text-slate-200">
                                            {formatCurrency(receivable.amount)}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => handleEdit(receivable)}
                                                className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"
                                                title="Visualizar / Editar"
                                            >
                                                <i className="bi bi-pencil-square text-lg"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {loading && (
                        <div className="p-20 flex flex-col items-center justify-center flex-1">
                            <div className="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buscando Recebimentos...</p>
                        </div>
                    )}

                    {filtered.length === 0 && !loading && (
                        <div className="p-20 flex flex-col items-center justify-center text-center flex-1">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6 border border-slate-100 dark:border-slate-800">
                                <i className="bi bi-check-circle text-4xl"></i>
                            </div>
                            <h4 className="text-xl font-black text-slate-400">Nenhuma conta a receber encontrada.</h4>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <ReceivableModal 
                  onClose={() => handleModalClose(false)} 
                  onSaved={() => handleModalClose(true)} 
                  receivable={selectedReceivable} 
                />
            )}
        </div>
    );
}
