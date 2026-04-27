import React from "react";
import Shipping from "../../../types/Shipping.type";
import { ValidationErrors } from "../../../utils/validations";

interface AgendamentoProps {
    scheduling: Shipping["scheduling"];
    onChangeScheduling: (key: keyof Shipping["scheduling"], value: string | Date | boolean) => void;
    errors: ValidationErrors;
    isPickup?: boolean;
}

const Agendamento = ({ scheduling, onChangeScheduling, errors, isPickup }: AgendamentoProps) => {
    if (!scheduling) return null;
    const hasError = errors['shipping_date'] || errors['shipping_time'];

    return (
        <div className="flex-1 flex flex-col min-w-0">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 ml-1">
                {isPickup ? 'Agendamento da Retirada' : 'Agendamento da Entrega'}
            </label>
            <div className={`bg-white dark:bg-slate-900 border p-4 sm:p-5 lg:p-6 rounded-3xl sm:rounded-[2rem] shadow-sm w-full transition-all ${hasError ? 'border-red-500 ring-4 ring-red-500/10 shadow-lg shadow-red-100 dark:shadow-red-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                
                {/* Top Action Buttons (Pickup only) */}
                {isPickup && (
                    <div className="flex justify-end mb-4">
                            <button
                            type="button"
                            onClick={() => {
                                const now = new Date();
                                const date = now.toISOString().split('T')[0];
                                const hours = String(now.getHours()).padStart(2, '0');
                                const mins = String(now.getMinutes()).padStart(2, '0');
                                const time = `${hours}:${mins}`;
                                
                                onChangeScheduling("notInformed", false);
                                onChangeScheduling("date", date);
                                onChangeScheduling("endDate", "");
                                onChangeScheduling("dateType", "fixed");
                                onChangeScheduling("type", "fixed");
                                onChangeScheduling("startTime", time);
                                onChangeScheduling("endTime", "");
                            }}
                            className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all border bg-emerald-500 border-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-95 flex items-center gap-2"
                            title="Define a data e hora como o momento atual (Já retirado pelo cliente)"
                        >
                            <i className="bi bi-lightning-fill" /> Retirada Imediata
                        </button>
                    </div>
                )}

                {!scheduling.notInformed ? (
                    <div className="flex flex-col gap-6 w-full">
                        {/* Section 1: DATE */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                                <div className="w-full sm:w-auto min-w-[140px]">
                                    <select
                                        className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-600 dark:text-slate-300 transition-all"
                                        value={scheduling.dateType || 'fixed'}
                                        onChange={(e) => onChangeScheduling("dateType", e.target.value as any)}
                                    >
                                        <option value="fixed" className="dark:bg-slate-900">Data Fixa</option>
                                        <option value="range" className="dark:bg-slate-900">Período de Datas</option>
                                    </select>
                                </div>

                                <div className="flex-1 flex flex-row items-center gap-3 relative group w-full">
                                    <div className="flex-1 relative">
                                        <input
                                            type="date"
                                            className={`w-full bg-transparent border px-3 py-2 rounded-xl outline-none text-sm transition-all dark:text-slate-300 ${errors['shipping_date'] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                            value={scheduling.date}
                                            onChange={(e) => onChangeScheduling("date", e.target.value)}
                                        />
                                        {errors['shipping_date'] && (
                                            <div className="absolute left-0 -top-10 hidden group-hover:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap">
                                                {errors['shipping_date']}
                                                <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                            </div>
                                        )}
                                    </div>

                                    {scheduling.dateType === 'range' && (
                                        <>
                                            <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-widest shrink-0 px-1">Até</span>
                                            <div className="flex-1 relative">
                                                <input
                                                    type="date"
                                                    className={`w-full bg-transparent border px-3 py-2 rounded-xl outline-none text-sm transition-all dark:text-slate-300 ${errors['shipping_date'] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                                    value={scheduling.endDate || ''}
                                                    onChange={(e) => onChangeScheduling("endDate", e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: TIME */}
                        <div className="flex flex-col gap-3 py-4 border-t border-slate-100 dark:border-slate-800/50">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full py-2">
                                <div className="w-full sm:w-auto min-w-[140px]">
                                    <select
                                        className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-600 dark:text-slate-300 transition-all"
                                        value={scheduling.type || 'fixed'}
                                        onChange={(e) => onChangeScheduling("type", e.target.value as any)}
                                    >
                                        <option value="fixed" className="dark:bg-slate-900">Horário Fixo</option>
                                        <option value="range" className="dark:bg-slate-900">Intervalo de Horas</option>
                                    </select>
                                </div>

                                <div className="flex-1 flex flex-row items-center gap-3 relative group w-full">
                                    <div className="flex-1 relative group/time">
                                        <input
                                            type="time"
                                            className={`w-full bg-transparent border px-3 py-2 rounded-xl outline-none text-sm transition-all dark:text-slate-300 ${errors['shipping_time'] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                            value={scheduling.startTime || ''}
                                            onChange={(e) => onChangeScheduling("startTime", e.target.value)}
                                        />
                                        {errors['shipping_time'] && (
                                            <div className="absolute left-0 -top-10 hidden group-hover/time:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap">
                                                {errors['shipping_time']}
                                                <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                            </div>
                                        )}
                                    </div>

                                    {scheduling.type === 'range' && (
                                        <>
                                            <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-widest shrink-0 px-1">Até</span>
                                            <div className="flex-1 relative group/time">
                                                <input
                                                    type="time"
                                                    className={`w-full bg-transparent border px-3 py-2 rounded-xl outline-none text-sm transition-all dark:text-slate-300 ${errors['shipping_time'] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                                    value={scheduling.endTime || ''}
                                                    onChange={(e) => onChangeScheduling("endTime", e.target.value)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-amber-50/50 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-2xl px-6 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500 grow-0 shrink-0">
                            <i className="bi bi-exclamation-triangle-fill text-xl" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Aviso de Agendamento</span>
                            <span className="text-[11px] font-medium text-amber-600/80 dark:text-amber-500/80 uppercase tracking-tight">
                                Data e horário não serão informados para esta {isPickup ? 'retirada' : 'entrega'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Agendamento;
