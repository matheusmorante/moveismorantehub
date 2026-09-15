import React, { useMemo } from 'react';
import { getSettings } from '@/pages/utils/settingsService';

interface PaymentSimulatorProps {
    totalValue: number;
}

const PaymentSimulator: React.FC<PaymentSimulatorProps> = ({ totalValue }) => {
    const settings = getSettings();
    const flags = settings.cardFlagRules || [];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="flex flex-col gap-6 p-4">
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">Valor do Orçamento em Simulação</span>
                    <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{formatCurrency(totalValue)}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <i className="bi bi-calculator-fill text-blue-500"></i>
                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Simulador de Parcelas</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {flags.length === 0 && (
                    <div className="col-span-full p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">
                         <i className="bi bi-credit-card-2-front text-4xl text-slate-200 mb-4 block"></i>
                         <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma bandeira configurada nas definições do sistema</p>
                    </div>
                )}
                
                {flags.map((flag, fIdx) => (
                    <div key={fIdx} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                            <div className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                                <i className="bi bi-credit-card-2-back-fill text-blue-600 text-xl"></i>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{flag.flag}</h3>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[300px] custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Parcelas</th>
                                        <th className="py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Parcela</th>
                                        <th className="py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total Final</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(inst => {
                                        // Find interest rate for this number of installments
                                        // Usually rates are "Up to X installments, rate is Y"
                                        // The user rules are defined as an array. We pick the one where installments >= inst, sorted by installments ascending.
                                        const rateRule = [...flag.interestRates]
                                            .sort((a, b) => a.installments - b.installments)
                                            .find(r => r.installments >= inst);
                                        
                                        const rate = rateRule ? rateRule.rate : 0;
                                        const totalWithInterest = totalValue * (1 + rate / 100);
                                        const installmentValue = totalWithInterest / inst;

                                        return (
                                            <tr key={inst} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="py-3 text-xs font-black text-slate-700 dark:text-slate-200">{inst}x {rate === 0 && <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md text-[8px] uppercase tracking-tighter">Sem Juros</span>}</td>
                                                <td className="py-3 text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(installmentValue)}</td>
                                                <td className="py-3 text-right">
                                                    <span className={`text-[10px] font-black ${rate > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                        {formatCurrency(totalWithInterest)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/20 flex gap-4">
                <i className="bi bi-info-circle-fill text-amber-500 text-xl shrink-0"></i>
                <div className="flex flex-col">
                    <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-tight mb-1">Nota sobre a Simulação</h4>
                    <p className="text-xs text-amber-600/80 dark:text-amber-500/80 leading-relaxed font-medium">
                        Os valores apresentados acima são simulações baseadas nas taxas de juros cadastradas para cada bandeira. 
                        A confirmação final do parcelamento deve ser feita diretamente na maquininha ou portal de pagamentos no momento da venda.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentSimulator;
