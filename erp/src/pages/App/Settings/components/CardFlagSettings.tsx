import React, { useState } from 'react';
import { AppSettings, CardFlagRule } from '@/pages/utils/settingsService';

interface CardFlagSettingsProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const CardFlagSettings: React.FC<CardFlagSettingsProps> = ({ settings, onChange }) => {
    const rules = settings.cardFlagRules || [];
    const [newFlagName, setNewFlagName] = useState('');
    const [addingRateToFlagIdx, setAddingRateToFlagIdx] = useState<number | null>(null);
    const [newRate, setNewRate] = useState({ installments: 10, rate: '' });

    const handleAddFlag = () => {
        if (!newFlagName.trim()) return;
        const newRules = [...rules, { flag: newFlagName.toUpperCase().trim(), interestRates: [] }];
        onChange('cardFlagRules', newRules);
        setNewFlagName('');
    };

    const handleRemoveFlag = (idx: number) => {
        if (window.confirm(`Deseja realmente remover a bandeira ${rules[idx].flag}?`)) {
            const newRules = rules.filter((_, i) => i !== idx);
            onChange('cardFlagRules', newRules);
        }
    };

    const handleAddRate = (flagIdx: number) => {
        const inst = newRate.installments;
        const rateVal = parseFloat(newRate.rate.toString().replace(',', '.')) || 0;
        
        if (inst > 0) {
            const newRules = [...rules];
            // Remove existing rule for same installment count if exists
            const filteredRates = newRules[flagIdx].interestRates.filter(r => r.installments !== inst);
            
            newRules[flagIdx].interestRates = [
                ...filteredRates,
                { installments: inst, rate: rateVal }
            ].sort((a, b) => a.installments - b.installments);
            
            onChange('cardFlagRules', newRules);
            setAddingRateToFlagIdx(null);
            setNewRate({ installments: 10, rate: '' });
        }
    };

    const handleRemoveRate = (flagIdx: number, rateIdx: number) => {
        const newRules = [...rules];
        newRules[flagIdx].interestRates = newRules[flagIdx].interestRates.filter((_, i) => i !== rateIdx);
        onChange('cardFlagRules', newRules);
    };

    return (
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl lg:rounded-[3rem] overflow-hidden">
            {/* Header com Input de Nova Bandeira */}
            <div className="p-6 md:p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="max-w-xl">
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-base uppercase tracking-widest mb-2 flex items-center gap-3">
                            <i className="bi bi-credit-card-2-front-fill text-blue-600"></i>
                            Bandeiras e Regras de Juros
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                            Configure as bandeiras aceitas e as taxas de juros por número de parcelas. 
                            Bandeiras como <span className="text-blue-500 font-bold">VISA, MASTERCARD, ELO, HIPERCARD</span> costumam não ter juros (campo vazio ou 0%).
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500">
                        <input 
                            type="text" 
                            placeholder="NOME DA BANDEIRA (EX: SENFF)"
                            value={newFlagName}
                            onChange={e => setNewFlagName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddFlag()}
                            className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 focus:ring-0 w-32 md:w-48 px-3"
                        />
                        <button 
                            onClick={handleAddFlag}
                            disabled={!newFlagName.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20 disabled:shadow-none"
                        >
                            <span className="hidden md:inline">Adicionar</span>
                            <i className="bi bi-plus md:hidden text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-10 grid grid-cols-1 xl:grid-cols-2 gap-8">
                {rules.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-40">
                         <i className="bi bi-credit-card-2-front text-5xl mb-4 text-slate-200"></i>
                         <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">Nenhuma bandeira cadastrada</p>
                    </div>
                )}
                
                {rules.map((rule, fIdx) => (
                    <div key={fIdx} className="bg-slate-50/50 dark:bg-slate-800/20 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 group transition-all p-6 md:p-8 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform">
                                    <i className="bi bi-bank text-blue-600 text-xl"></i>
                                </div>
                                <div className="flex flex-col">
                                    <h5 className="font-black text-slate-800 dark:text-slate-100 text-xl tracking-tight leading-none uppercase">{rule.flag}</h5>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuração de Crédito</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleRemoveFlag(fIdx)}
                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            >
                                <i className="bi bi-trash text-lg"></i>
                            </button>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-2 mb-6">
                            {rule.interestRates.length === 0 && (
                                <div className="bg-white/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sem regras de juros</p>
                                    <p className="text-[8px] text-slate-300 mt-1 uppercase font-bold">Cobrará 0% para todas as parcelas</p>
                                </div>
                            )}
                            
                            {rule.interestRates.map((rate, rIdx) => (
                                <div key={rIdx} className="flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm group/rate">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-600 flex items-center justify-center text-[10px] font-black tracking-tight border border-blue-100/50">
                                            {rate.installments}x
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Taxa de Juros</span>
                                            <span className={`text-sm font-black ${rate.rate > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                                                {rate.rate === 0 ? 'SEM JUROS (0,00%)' : `${rate.rate.toFixed(2).replace('.', ',')}% ADICIONAL`}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveRate(fIdx, rIdx)}
                                        className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-red-400 transition-all opacity-0 group-hover/rate:opacity-100"
                                    >
                                        <i className="bi bi-x-circle-fill"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Inline Adding Area */}
                        {addingRateToFlagIdx === fIdx ? (
                            <div className="bg-white dark:bg-slate-950 rounded-3xl p-5 border-2 border-blue-100 dark:border-blue-900/30 animate-fade-in shadow-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h6 className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Nova Regra de Juros</h6>
                                    <button onClick={() => setAddingRateToFlagIdx(null)} className="text-slate-300 hover:text-slate-500"><i className="bi bi-x-lg text-xs"></i></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[8px] font-black uppercase text-slate-400 ml-1">Até X Parcelas</span>
                                        <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="10"
                                                value={newRate.installments}
                                                onChange={e => setNewRate(prev => ({ ...prev, installments: parseInt(e.target.value) || 1 }))}
                                                className="bg-transparent border-none text-xs font-black w-full focus:ring-0 p-0"
                                            />
                                            <span className="text-[10px] font-black text-slate-300">X</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[8px] font-black uppercase text-slate-400 ml-1">Taxa (%)</span>
                                        <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
                                            <input 
                                                type="text" 
                                                placeholder="0,00"
                                                value={newRate.rate}
                                                onChange={e => setNewRate(prev => ({ ...prev, rate: e.target.value }))}
                                                className="bg-transparent border-none text-xs font-black w-full focus:ring-0 p-0"
                                            />
                                            <span className="text-[10px] font-black text-slate-300">%</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleAddRate(fIdx)}
                                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                                >
                                    Confirmar Regra
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setAddingRateToFlagIdx(fIdx)}
                                className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 py-4 rounded-3xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 hover:border-blue-200 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2 group/add"
                            >
                                <i className="bi bi-plus-circle-fill group-hover:scale-110 transition-transform"></i>
                                Adicionar Regra de Juros
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }` }} />
        </div>
    );
};

export default CardFlagSettings;
