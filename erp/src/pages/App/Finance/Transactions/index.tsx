import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { financeService } from '@/pages/services/financeService';
import { FinancialTransaction, FinancialCategory } from "../../../types/finance.type";
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatToBRDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
};

export default function Transactions() {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");

    // Modal Nova Transação Manual
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categories, setCategories] = useState<FinancialCategory[]>([]);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        type: 'expense' as 'income' | 'expense',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: 'Manual',
        category_id: '',
        notes: ''
    });

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const data = await financeService.getTransactions();
            setTransactions(data || []);
            
            const cats = await financeService.getCategories();
            setCategories(cats || []);
        } catch (error) {
            console.error("Erro ao buscar fluxo de caixa:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleSaveTransaction = async () => {
        if (!formData.description || formData.amount <= 0 || !formData.date) {
            toast.error("Preencha descrição, valor e data.");
            return;
        }

        setSaving(true);
        try {
            await financeService.createTransaction(formData);
            toast.success("Movimentação registrada!");
            setIsModalOpen(false);
            setFormData({
                type: 'expense',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                description: '',
                payment_method: 'Manual',
                category_id: '',
                notes: ''
            });
            fetchTransactions();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar transação.");
        } finally {
            setSaving(false);
        }
    };

    const filtered = transactions.filter(t => {
        const matchesSearch = normalizeSearchTerm(t.description || '').includes(normalizeSearchTerm(search));
        const matchesType = typeFilter === "all" || t.type === typeFilter;
        return matchesSearch && matchesType;
    });

    // Calcula Totais
    const totalEntradas = filtered.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalSaidas = filtered.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const saldoPeriodo = totalEntradas - totalSaidas;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-10">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-6">
                    <div className="flex items-start xl:items-center gap-4 xl:gap-6">
                        <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
                            <i className="bi bi-clock-history text-2xl xl:text-3xl"></i>
                        </div>
                        <div>
                            <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                                Movimentações (Extrato)
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                                Histórico completo de entradas e saídas do caixa.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center justify-center gap-2 xl:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 xl:px-8 xl:py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto"
                        >
                            <i className="bi bi-plus-lg text-sm xl:text-base" />
                            Novo Lançamento
                        </button>
                    </div>
                </div>

                {/* Cards de Resumo Rápido */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                                <i className="bi bi-arrow-up-circle-fill text-xl"></i>
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Entradas (Filtro)</h3>
                        </div>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalEntradas)}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center">
                                <i className="bi bi-arrow-down-circle-fill text-xl"></i>
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Saídas (Filtro)</h3>
                        </div>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalSaidas)}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <i className="bi bi-wallet2 text-6xl text-blue-600"></i>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saldoPeriodo >= 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20'} `}>
                                <i className="bi bi-cash-stack text-xl"></i>
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Saldo Período</h3>
                        </div>
                        <p className={`text-2xl font-black ${saldoPeriodo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-500'}`}>
                            {formatCurrency(saldoPeriodo)}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-all flex-col flex h-full">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input 
                                type="text" 
                                placeholder="Buscar no histórico..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-slate-200"
                            />
                        </div>
                        <div className="flex gap-2 border border-slate-100 dark:border-slate-800 p-1 rounded-xl bg-slate-50 dark:bg-slate-950">
                            {[
                              { id: 'all', label: 'Tudo' },
                              { id: 'income', label: 'Entradas' },
                              { id: 'expense', label: 'Saídas' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setTypeFilter(filter.id as any)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                        typeFilter === filter.id 
                                            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
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
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">Data</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">Descrição</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-center">Tipo</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-center">Método</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filtered.map((transaction) => {
                                    const isIncome = transaction.type === 'income';
                                    return (
                                    <tr key={transaction.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                        <td className="px-8 py-5 text-xs font-mono font-bold text-slate-400">
                                            #{transaction.id?.slice(0, 8)}
                                        </td>
                                        <td className="px-8 py-5 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatToBRDate(transaction.date)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="block font-bold text-slate-700 dark:text-slate-200">{transaction.description}</span>
                                            {transaction.category_id && (
                                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 inline-block">
                                                {categories.find(c => c.id === transaction.category_id)?.name || 'Outros'}
                                              </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/20'}`}>
                                                {isIncome ? 'Entrada' : 'Saída'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center text-xs font-bold text-slate-500">
                                            {transaction.payment_method}
                                        </td>
                                        <td className={`px-8 py-5 text-right font-black ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isIncome ? '+ ' : '- '}{formatCurrency(transaction.amount)}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>

                    {loading && (
                        <div className="p-20 flex flex-col items-center justify-center flex-1">
                            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Histórico...</p>
                        </div>
                    )}

                    {filtered.length === 0 && !loading && (
                        <div className="p-20 flex flex-col items-center justify-center text-center flex-1">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6 border border-slate-100 dark:border-slate-800">
                                <i className="bi bi-clock-history text-4xl"></i>
                            </div>
                            <h4 className="text-xl font-black text-slate-400">Nenhuma movimentação no período.</h4>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Lançamento Rápido */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col animate-slide-up">
                        <div className="p-6 xl:p-8 border-b border-slate-50 dark:border-slate-800">
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Lançamento Direto no Caixa</h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sem vínculo com Contas a Pagar/Receber</p>
                        </div>
                        <div className="p-6 xl:p-8 space-y-4">
                            <div className="flex gap-4 mb-4">
                                <button
                                    onClick={() => setFormData({...formData, type: 'income'})}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        formData.type === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    Entrada
                                </button>
                                <button
                                    onClick={() => setFormData({...formData, type: 'expense'})}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        formData.type === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    Saída
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="Descrição"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    placeholder="Valor R$"
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                                    className="w-1/2 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                    className="w-1/2 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <select
                                value={formData.category_id}
                                onChange={e => setFormData({...formData, category_id: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Sem categoria</option>
                                {categories.filter(c => c.type === formData.type).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-6 xl:p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-xs uppercase tracking-widest">
                                Cancelar
                            </button>
                            <button onClick={handleSaveTransaction} disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-colors disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none flex justify-center items-center gap-2">
                                {saving ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-check-lg"></i>}
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
