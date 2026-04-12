import React, { useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Cell, PieChart, Pie, Legend
} from 'recharts';
import { ABCResult } from './useSalesReport';

interface Props {
    results: ABCResult[];
    monthCount: number;
}

const SupplierPerformanceView: React.FC<Props> = ({ results, monthCount }) => {
    const supplierStats = useMemo(() => {
        const stats: Record<string, { 
            name: string, 
            totalProfit: number, 
            totalTurnover: number,
            monthlyProfit: number,
            monthlyTurnover: number,
            itemCount: number
        }> = {};

        results.forEach(item => {
            const sName = item.supplier || 'Sem Fornecedor';
            if (!stats[sName]) {
                stats[sName] = { 
                    name: sName, 
                    totalProfit: 0, 
                    totalTurnover: 0, 
                    monthlyProfit: 0, 
                    monthlyTurnover: 0,
                    itemCount: 0
                };
            }
            stats[sName].totalProfit += item.totalProfit;
            stats[sName].totalTurnover += item.totalQuantity;
            stats[sName].monthlyProfit += item.monthlyProfit;
            stats[sName].monthlyTurnover += item.monthlyTurnover;
            stats[sName].itemCount += 1;
        });

        return Object.values(stats).sort((a, b) => b.totalProfit - a.totalProfit);
    }, [results]);

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    if (results.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <i className="bi bi-graph-down text-6xl mb-4 text-slate-300"></i>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum dado para exibir com os filtros atuais</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 animate-fade-in">
            {/* Cards de resumo por fornecedor? Talvez no topo */}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico 1: Lucro por Fornecedor */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-10 flex items-center justify-between">
                        Lucro Total por Fornecedor
                        <i className="bi bi-currency-dollar text-indigo-500"></i>
                    </h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={supplierStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" fontSize={9} fontWeight="900" tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR')}`} />
                                <YAxis dataKey="name" type="category" fontSize={9} fontWeight="900" tickLine={false} axisLine={false} width={100} />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}
                                    formatter={(value: any) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Lucro Total']}
                                />
                                <Bar dataKey="totalProfit" radius={[0, 10, 10, 0]}>
                                    {supplierStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico 2: Giro por Fornecedor */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-10 flex items-center justify-between">
                        Volume (Giro) por Fornecedor
                        <i className="bi bi-box-seam text-emerald-500"></i>
                    </h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...supplierStats].sort((a,b) => b.totalTurnover - a.totalTurnover)} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" fontSize={9} fontWeight="900" tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" fontSize={9} fontWeight="900" tickLine={false} axisLine={false} width={100} />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)', padding: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}
                                    formatter={(value: any) => [`${value} unidades`, 'Giro Total']}
                                />
                                <Bar dataKey="totalTurnover" radius={[0, 10, 10, 0]}>
                                    {supplierStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[(index + 2) % colors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Nova Tabela de Performance por Fornecedor */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-955/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Fornecedor</th>
                            <th className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Itens Ativos</th>
                            <th className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Giro Mensal</th>
                            <th className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Lucro Mensal</th>
                            <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Lucro Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {supplierStats.map((s, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                                            {i + 1}
                                        </div>
                                        <p className="text-[12px] font-black text-slate-800 dark:text-slate-100">{s.name}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className="px-3 py-1 bg-slate-50 dark:bg-slate-950 rounded-lg text-[11px] font-black text-slate-500">{s.itemCount}</span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <span className="text-[12px] font-black text-slate-700 dark:text-slate-300">{s.monthlyTurnover.toFixed(1)}</span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <span className="text-[12px] font-black text-indigo-600">{s.monthlyProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <span className="text-[12px] font-black text-emerald-600">{s.totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupplierPerformanceView;
