import React, { useState } from 'react';
import { AppSettings } from '@/pages/utils/settingsService';

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const CardFlagSettings: React.FC<Props> = ({ settings, onChange }) => {
    const rules = settings.cardFlagRules || [];
    const [newFlag, setNewFlag] = useState('');
    const [addingRateFor, setAddingRateFor] = useState<number | null>(null);
    const [installments, setInstallments] = useState('10');
    const [rate, setRate] = useState('0');

    const updateRules = (nextRules: typeof rules) => onChange('cardFlagRules', nextRules);
    const addFlag = () => {
        const flag = newFlag.trim().toUpperCase();
        if (!flag || rules.some(rule => rule.flag.toUpperCase() === flag)) return;
        updateRules([...rules, { flag, interestRates: [] }]);
        setNewFlag('');
    };
    const removeFlag = (index: number) => updateRules(rules.filter((_, current) => current !== index));
    const removeRate = (flagIndex: number, rateIndex: number) => updateRules(rules.map((rule, current) => (
        current === flagIndex ? { ...rule, interestRates: rule.interestRates.filter((_, rateCurrent) => rateCurrent !== rateIndex) } : rule
    )));
    const addRate = (flagIndex: number) => {
        const parsedInstallments = Number(installments);
        const parsedRate = Number(rate.replace(',', '.'));
        if (!Number.isInteger(parsedInstallments) || parsedInstallments < 1 || !Number.isFinite(parsedRate)) return;
        updateRules(rules.map((rule, current) => {
            if (current !== flagIndex) return rule;
            const interestRates = [
                ...rule.interestRates.filter(item => item.installments !== parsedInstallments),
                { installments: parsedInstallments, rate: parsedRate },
            ].sort((a, b) => a.installments - b.installments);
            return { ...rule, interestRates };
        }));
        setAddingRateFor(null);
        setInstallments('10');
        setRate('0');
    };

    return (
        <div className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">Bandeiras e juros</h4>
                    <p className="mt-1 text-xs text-slate-400">Cadastre as bandeiras aceitas e as taxas por parcela.</p>
                </div>
                <div className="flex gap-2">
                    <input value={newFlag} onChange={event => setNewFlag(event.target.value)} onKeyDown={event => event.key === 'Enter' && addFlag()} placeholder="Nova bandeira" className="w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950" />
                    <button type="button" onClick={addFlag} disabled={!newFlag.trim()} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><i className="bi bi-plus-lg mr-1" />Adicionar</button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-950">
                        <tr><th className="px-4 py-3">Bandeira</th><th className="px-4 py-3">Juros por parcela</th><th className="w-28 px-4 py-3 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rules.map((rule, flagIndex) => (
                            <React.Fragment key={rule.flag}>
                                <tr className="bg-white dark:bg-slate-900">
                                    <td className="px-4 py-3 font-black text-slate-800 dark:text-slate-100">{rule.flag}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                        {rule.interestRates.length === 0 ? 'Sem juros configurados' : rule.interestRates.map((item, index) => (
                                            <span key={`${item.installments}-${index}`} className="mr-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-bold dark:bg-slate-800">{item.installments}x · {item.rate.toFixed(2).replace('.', ',')}%<button type="button" onClick={() => removeRate(flagIndex, index)} title="Remover taxa" className="text-slate-400 hover:text-red-500"><i className="bi bi-x" /></button></span>
                                        ))}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button type="button" onClick={() => setAddingRateFor(flagIndex)} className="mr-3 text-blue-600 hover:text-blue-800" title="Adicionar taxa"><i className="bi bi-plus-circle" /></button>
                                        <button type="button" onClick={() => removeFlag(flagIndex)} className="text-slate-400 hover:text-red-500" title="Remover bandeira"><i className="bi bi-trash" /></button>
                                    </td>
                                </tr>
                                {addingRateFor === flagIndex && <tr className="bg-slate-50 dark:bg-slate-950"><td colSpan={3} className="px-4 py-3"><div className="flex items-center justify-end gap-2"><input type="number" min="1" value={installments} onChange={event => setInstallments(event.target.value)} aria-label="Parcelas" className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900" /><span className="text-slate-400">parcelas</span><input inputMode="decimal" value={rate} onChange={event => setRate(event.target.value)} aria-label="Taxa de juros" className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900" /><span className="text-slate-400">%</span><button type="button" onClick={() => addRate(flagIndex)} className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white">Salvar</button><button type="button" onClick={() => setAddingRateFor(null)} className="px-2 text-slate-400">Cancelar</button></div></td></tr>}
                            </React.Fragment>
                        ))}
                        {rules.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Nenhuma bandeira cadastrada.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CardFlagSettings;
