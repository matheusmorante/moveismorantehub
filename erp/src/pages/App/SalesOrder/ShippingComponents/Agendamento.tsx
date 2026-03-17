import React from "react";
import Shipping from "../../../types/Shipping.type";
import { ValidationErrors } from "../../../utils/validations";

interface AgendamentoProps {
    scheduling: Shipping["scheduling"];
    onChangeScheduling: (key: keyof Shipping["scheduling"], value: string | Date) => void;
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
                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 relative group w-full">
                    {/* Date */}
                    {isPickup && (
                        <div className="absolute -top-10 right-0 flex items-center gap-2">
                             <button
                                type="button"
                                onClick={() => {
                                    const newValue = !scheduling.notInformed;
                                    onChangeScheduling("notInformed", newValue);
                                    if (newValue) {
                                        onChangeScheduling("date", "");
                                        onChangeScheduling("startTime", "");
                                        onChangeScheduling("endTime", "");
                                    }
                                }}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all border ${
                                    scheduling.notInformed 
                                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm' 
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-amber-500 hover:text-amber-500'
                                }`}
                            >
                                {scheduling.notInformed ? '📅 Informar Agendamento' : '🚫 Não informar'}
                            </button>
                        </div>
                    )}

                    {!scheduling.notInformed ? (
                        <>
                            <div className="flex-1 min-w-[140px] w-full relative">
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
                        </>
                    ) : (
                        <div className="flex-1 bg-amber-50/50 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-xl px-4 py-2 flex items-center gap-3">
                            <span className="text-amber-600 dark:text-amber-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </span>
                            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                                Data e horário não serão informados para esta retirada
                            </span>
                        </div>
                    )}
                </div>

                {!scheduling.notInformed && (
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 mt-4 w-full">
                        {/* Type Select */}
                        <div className="w-full sm:w-auto min-w-[120px]">
                            <select
                                className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-600 dark:text-slate-300 transition-all"
                                value={scheduling.type || 'fixed'}
                                onChange={(e) => onChangeScheduling("type", e.target.value as any)}
                            >
                                <option value="fixed" className="dark:bg-slate-900">Horário Fixo</option>
                                <option value="range" className="dark:bg-slate-900">Intervalo</option>
                            </select>
                        </div>

                        {/* Time Inputs */}
                        {scheduling.type === 'range' ? (
                            <div className="flex flex-1 flex-row items-center gap-3 relative group/time min-w-[200px] w-full">
                                <input
                                    type="time"
                                    className={`w-full bg-transparent border px-3 py-2 rounded-xl outline-none text-sm transition-all dark:text-slate-300 ${errors['shipping_time'] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                    value={scheduling.startTime || ''}
                                    onChange={(e) => onChangeScheduling("startTime", e.target.value)}
                                />
                                <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-widest shrink-0">Até</span>
                                <input
                                    type="time"
                                    className={`w-full bg-transparent border px-3 py-2 rounded-xl outline-none text-sm transition-all dark:text-slate-300 ${errors['shipping_time'] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                    value={scheduling.endTime || ''}
                                    onChange={(e) => onChangeScheduling("endTime", e.target.value)}
                                />
                                {errors['shipping_time'] && (
                                    <div className="absolute left-0 -top-10 hidden group-hover/time:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap">
                                        {errors['shipping_time']}
                                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 min-w-[120px] w-full relative group/time">
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
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Agendamento;
