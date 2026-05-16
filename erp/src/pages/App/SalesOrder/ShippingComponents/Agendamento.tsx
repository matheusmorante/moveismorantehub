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
            <div className="flex items-center justify-between mb-4 ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {isPickup ? 'Agendamento da Retirada' : 'Agendamento da Entrega'}
                </label>
                
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            const isPending = !scheduling.pendingScheduling;
                            onChangeScheduling("pendingScheduling", isPending);
                            if (isPending) {
                                onChangeScheduling("date", "");
                                onChangeScheduling("startTime", "");
                                onChangeScheduling("notInformed", false);
                            }
                        }}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                            scheduling.pendingScheduling 
                                ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200 dark:shadow-none' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-orange-300'
                        }`}
                    >
                        <i className={`bi ${scheduling.pendingScheduling ? 'bi-clock-history' : 'bi-clock-fill'}`} />
                        {scheduling.pendingScheduling ? 'Agendamento Pendente' : 'Marcar p/ Agendar Depois'}
                    </button>

                    {isPickup && (
                        <button
                            type="button"
                            onClick={() => {
                                const now = new Date();
                                const date = now.toISOString().split('T')[0];
                                const hours = String(now.getHours()).padStart(2, '0');
                                const mins = String(now.getMinutes()).padStart(2, '0');
                                const time = `${hours}:${mins}`;
                                
                                onChangeScheduling("pendingScheduling", false);
                                onChangeScheduling("notInformed", false);
                                onChangeScheduling("date", date);
                                onChangeScheduling("endDate", "");
                                onChangeScheduling("dateType", "fixed");
                                onChangeScheduling("type", "fixed");
                                onChangeScheduling("startTime", time);
                                onChangeScheduling("endTime", "");
                            }}
                            className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border bg-emerald-500 border-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-95 flex items-center gap-2"
                        >
                            <i className="bi bi-lightning-fill" /> Retirada Imediata
                        </button>
                    )}
                </div>
            </div>

            <div className={`bg-white dark:bg-slate-900 border p-4 sm:p-5 lg:p-6 rounded-3xl sm:rounded-[2rem] shadow-sm w-full transition-all ${scheduling.pendingScheduling ? 'border-orange-200 bg-orange-50/20 ring-4 ring-orange-500/5' : (hasError ? 'border-red-500 ring-4 ring-red-500/10 shadow-lg shadow-red-100 dark:shadow-red-900/10' : 'border-slate-100 dark:border-slate-800')}`}>
                
                {scheduling.pendingScheduling && (
                    <div className="flex items-center gap-4 py-4 px-4 bg-orange-50/50 dark:bg-orange-900/10 border border-dashed border-orange-200 dark:border-orange-800 rounded-2xl mb-6 animate-fade-in">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                            <i className="bi bi-clock-history text-xl" />
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-[11px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest leading-none mb-1">Agendamento em Aberto</h4>
                            <p className="text-[9px] font-bold text-orange-600/70 dark:text-orange-500/70 uppercase leading-tight">
                                Este pedido será agendado em breve.
                            </p>
                        </div>
                    </div>
                )}

                {!scheduling.notInformed ? (
                    <div className={`flex flex-col gap-6 w-full transition-all duration-300 ${scheduling.pendingScheduling ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}`}>
                        {/* Section 1: DATE */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                                <div className="w-full sm:w-auto min-w-[140px]">
                                    <select
                                        disabled={scheduling.pendingScheduling}
                                        className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-600 dark:text-slate-300 transition-all"
                                        value={scheduling.dateType || 'fixed'}
                                        onChange={(e) => onChangeScheduling("dateType", e.target.value as any)}
                                    >
                                        <option value="fixed" className="dark:bg-slate-900">Data Fixa</option>
                                        <option value="range" className="dark:bg-slate-900">Período de Data</option>
                                    </select>
                                </div>

                                <div className="flex-1 flex flex-row items-center gap-3 relative group w-full">
                                    <div className="flex-1 relative">
                                        <input
                                            type="date"
                                            disabled={scheduling.pendingScheduling}
                                            className={`w-full bg-transparent border px-3 py-2 rounded-xl outline-none text-sm transition-all dark:text-slate-300 ${errors['shipping_date'] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                            value={scheduling.date || ''}
                                            onChange={(e) => onChangeScheduling("date", e.target.value)}
                                        />
                                    </div>

                                    {scheduling.dateType === 'range' && (
                                        <>
                                            <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-widest shrink-0 px-1">Até</span>
                                            <div className="flex-1 relative">
                                                <input
                                                    type="date"
                                                    disabled={scheduling.pendingScheduling}
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
                                        disabled={scheduling.pendingScheduling}
                                        className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-600 dark:text-slate-300 transition-all"
                                        value={scheduling.type || 'fixed'}
                                        onChange={(e) => onChangeScheduling("type", e.target.value as any)}
                                    >
                                        <option value="fixed" className="dark:bg-slate-900">Horário Fixo</option>
                                        <option value="range" className="dark:bg-slate-900">Período de Horário</option>
                                    </select>
                                </div>

                                <div className="flex-1 flex flex-row items-center gap-3 relative group w-full">
                                    <div className="flex-1 relative group/time">
                                        <input
                                            type="time"
                                            disabled={scheduling.pendingScheduling}
                                            className={`w-full bg-transparent border px-3 py-2 rounded-xl outline-none text-sm transition-all dark:text-slate-300 ${errors['shipping_time'] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                                            value={scheduling.startTime || ''}
                                            onChange={(e) => onChangeScheduling("startTime", e.target.value)}
                                        />
                                    </div>

                                    {scheduling.type === 'range' && (
                                        <>
                                            <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-widest shrink-0 px-1">Até</span>
                                            <div className="flex-1 relative group/time">
                                                <input
                                                    type="time"
                                                    disabled={scheduling.pendingScheduling}
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
