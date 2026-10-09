import React, { useState, useEffect } from 'react';
import { financeService } from '@/pages/services/financeService';
import {
  FinancialTransaction,
  AccountPayable,
  AccountReceivable,
} from '../../../types/finance.type';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // To keep it simple, fetch all from this month (simplified client-side for now)
        const [transData, payData, recData] = await Promise.all([
          financeService.getReportTransactions(),
          financeService.getReportPayables('pending'), // Only pending
          financeService.getReportReceivables('pending'), // Only pending
        ]);

        setTransactions(transData || []);
        setPayables(payData || []);
        setReceivables(recData || []);
      } catch (error) {
        console.error('Erro ao carregar dashboard financeiro', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calcula Totais Realizados (Fluxo de Caixa)
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentMonthTrans = transactions.filter((t) => t.date.startsWith(currentMonth));

  const receitasRealizadas = currentMonthTrans
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const despesasRealizadas = currentMonthTrans
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const saldoAtual = receitasRealizadas - despesasRealizadas;

  // Calcula Previsões (A Pagar / A Receber)
  const contasAPagarTotal = payables.reduce((acc, curr) => acc + curr.amount, 0);
  const contasAReceberTotal = receivables.reduce((acc, curr) => acc + curr.amount, 0);

  // Preparar dados para o gráfico de barras (Receitas vs Despesas dos últimos 6 meses - MOCK simplificado por enquanto usando o mes atual)
  const chartData = [
    {
      name: 'Mês Atual',
      Receitas: receitasRealizadas,
      Despesas: despesasRealizadas,
    },
  ];

  if (loading) {
    return (
      <div className="flex-1 p-20 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-6" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 animate-pulse">
          Carregando Dashboard Financeiro...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-10">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-10 gap-6">
          <div className="flex items-start xl:items-center gap-4 xl:gap-6">
            <div className="w-12 h-12 xl:w-16 xl:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
              <i className="bi bi-wallet2 text-2xl xl:text-3xl"></i>
            </div>
            <div>
              <h1 className="text-2xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">
                Gestão de Caixa
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm xl:text-lg hidden sm:block">
                Resumo financeiro, fluxo de caixa e previsibilidade.
              </p>
            </div>
          </div>
        </div>

        {/* Cards de Saldo Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 xl:p-8 shadow-xl shadow-emerald-200 dark:shadow-none text-white relative overflow-hidden transition-transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <i className="bi bi-arrow-up-circle-fill text-7xl"></i>
            </div>
            <h3 className="text-sm xl:text-base font-bold text-emerald-100 mb-1">
              Receitas Realizadas (Mês)
            </h3>
            <p className="text-3xl xl:text-4xl font-black tracking-tight">
              {formatCurrency(receitasRealizadas)}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <i className="bi bi-check2-all text-xs"></i>
              <span className="text-[10px] uppercase tracking-widest font-black">Já no caixa</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-6 xl:p-8 shadow-xl shadow-rose-200 dark:shadow-none text-white relative overflow-hidden transition-transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <i className="bi bi-arrow-down-circle-fill text-7xl"></i>
            </div>
            <h3 className="text-sm xl:text-base font-bold text-rose-100 mb-1">
              Despesas Realizadas (Mês)
            </h3>
            <p className="text-3xl xl:text-4xl font-black tracking-tight">
              {formatCurrency(despesasRealizadas)}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <i className="bi bi-check2-all text-xs"></i>
              <span className="text-[10px] uppercase tracking-widest font-black">Já pagas</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 xl:p-8 shadow-xl shadow-blue-200 dark:shadow-none text-white relative overflow-hidden transition-transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <i className="bi bi-wallet-fill text-7xl"></i>
            </div>
            <h3 className="text-sm xl:text-base font-bold text-blue-100 mb-1">Saldo Atual (Mês)</h3>
            <p className="text-3xl xl:text-4xl font-black tracking-tight">
              {formatCurrency(saldoAtual)}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <i className="bi bi-cash-stack text-xs"></i>
              <span className="text-[10px] uppercase tracking-widest font-black">Disponível</span>
            </div>
          </div>
        </div>

        {/* Linha 2: Previsibilidade & Gráficos */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Previsibilidade */}
          <div className="xl:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 xl:p-8 shadow-sm flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-emerald-50 to-transparent dark:from-emerald-900/10 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100"></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                A Receber (Previsão)
              </h3>
              <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-2">
                {formatCurrency(contasAReceberTotal)}
              </p>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <i className="bi bi-calendar-check text-emerald-500"></i>
                {receivables.length} títulos pendentes
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 xl:p-8 shadow-sm flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-rose-50 to-transparent dark:from-rose-900/10 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100"></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                A Pagar (Previsão)
              </h3>
              <p className="text-4xl font-black text-slate-800 dark:text-slate-100 mb-2">
                {formatCurrency(contasAPagarTotal)}
              </p>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <i className="bi bi-calendar-x text-rose-500"></i>
                {payables.length} compromissos pendentes
              </p>
            </div>
          </div>

          {/* Gráfico */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 xl:p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6">
              Receitas vs Despesas (Mês Atual)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                    tickFormatter={(val) => `R$ ${val / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[8, 8, 8, 8]} />
                  <Bar dataKey="Despesas" fill="#f43f5e" radius={[8, 8, 8, 8]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
