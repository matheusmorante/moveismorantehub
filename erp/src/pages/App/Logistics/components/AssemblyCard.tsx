import React from 'react';
import { Drill } from '@/components/shared/DrillIcon';
import { ShowcaseAssembly } from '@/pages/utils/showcaseAssemblyService';
import { getOrderTypeClasses } from '@/pages/utils/orderTypeColorUtils';

interface AssemblyCardProps {
    item: any;
    idx: number;
    isStandalone: boolean;
    handleEditShowcase: (item: ShowcaseAssembly) => void;
    handleDeleteShowcase: (id: string) => void;
}

const AssemblyCard: React.FC<AssemblyCardProps> = ({
    item,
    idx,
    isStandalone,
    handleEditShowcase,
    handleDeleteShowcase
}) => {
    const isShowcase = item.origin === 'showcase';
    const isFulfilled = item.status === 'fulfilled';
    
    // Cores dinâmicas como no cronograma
    const cls = getOrderTypeClasses(isShowcase ? 'rose' : 'orange');

    let displayTime = "Horário Livre";
    if (item.timeInfo) {
        displayTime = item.timeInfo.type === 'range' && item.timeInfo.startTime && item.timeInfo.endTime
            ? `${item.timeInfo.startTime} - ${item.timeInfo.endTime}`
            : (item.timeInfo.startTime || item.timeInfo.time || 'Horário Livre');
    }

    return (
        <div key={item.id + idx} className="relative pl-16 pb-16 group last:pb-8">
            {/* Nó da timeline (idêntico ao cronograma, 24x24px shadow-lg) */}
            <div className={`absolute left-0 top-8 w-6 h-6 -ml-3 rounded-full border-4 border-white dark:border-slate-900 z-10 shadow-lg transition-all duration-300 group-hover:scale-125 ${
                isFulfilled ? 'bg-emerald-500' : isShowcase ? 'bg-rose-500' : 'bg-orange-500'
            }`} />

            {/* Linha conectora vertical */}
            <div className="absolute left-0 top-14 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800 -ml-0.25 group-last:hidden" />

            {/* Card da Montagem (Visual da Agenda com cores dinâmicas e hover suave) */}
            <div className={`p-8 rounded-[2.5rem] border transition-all duration-300 hover:shadow-premium-lg group-hover:border-blue-300 dark:group-hover:border-blue-800 relative overflow-hidden ${cls.cardBg} ${cls.cardBorder}`}>

                {/* ─ Linha de badges + status + ações ─ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* badge origem */}
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm ${
                            isShowcase ? 'bg-rose-600' : 'bg-orange-600'
                        }`}>
                            {isShowcase ? 'Mostruário' : 'Pedido'}
                        </span>

                        {/* badge modalidade */}
                        {item.origin === 'order' && (
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                item.deliveryMethod === 'pickup'
                                    ? 'text-purple-600 border-purple-200 bg-purple-50/50'
                                    : 'text-cyan-600 border-cyan-200 bg-cyan-50/50'
                            }`}>
                                {item.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
                            </span>
                        )}

                        {/* horário */}
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            <i className="bi bi-clock-fill text-xs opacity-50" />
                            <span className="text-xs font-black tracking-tight">{displayTime}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* badge status */}
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                            isFulfilled
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                            {isFulfilled ? 'Finalizado' : 'Agendado'}
                        </span>

                        {/* botões mostruário */}
                        {!isStandalone && isShowcase && (
                            <div className="flex items-center gap-1 ml-1">
                                <button
                                    onClick={() => handleEditShowcase(item.fullData)}
                                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all border border-slate-100 dark:border-slate-800"
                                    title="Editar"
                                >
                                    <i className="bi bi-pencil-square text-sm" />
                                </button>
                                <button
                                    onClick={() => handleDeleteShowcase(item.id)}
                                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all border border-slate-100 dark:border-slate-800"
                                    title="Excluir"
                                >
                                    <i className="bi bi-trash text-sm" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─ Nome / subtítulo ─ */}
                <div className="flex flex-col gap-1 mb-4">
                    <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter leading-none">
                        {item.title}
                    </h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {item.subtitle}
                    </p>
                </div>

                {/* Badges de Modalidade de Montagem (Visual Cromograma) */}
                <div className="flex flex-col gap-2 mt-4 mb-4">
                    {!isShowcase ? (
                        <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-4 rounded-[1.5rem] border-2 border-orange-100 dark:border-orange-900/30 animate-pulse shadow-lg w-fit">
                            <Drill className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-[0.1em] leading-tight">
                                    Montagem no Depósito
                                </span>
                                <span className="text-[9px] font-bold opacity-70 uppercase">Agendado para o depósito</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-[1.5rem] border-2 border-rose-100 dark:border-rose-900/30 animate-pulse shadow-lg w-fit">
                            <i className="bi bi-shop text-rose-500 text-xl shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-[0.1em] leading-tight">
                                    Montagem de Mostruário
                                </span>
                                <span className="text-[9px] font-bold opacity-70 uppercase">Organização física da loja</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─ Observação ─ */}
                {item.observation && (
                    <div className="mb-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-800/30 p-3 rounded-2xl">
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block mb-1">
                            Observações da Montagem:
                        </span>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">
                            "{item.observation}"
                        </p>
                    </div>
                )}

                {/* ─ Itens ─ */}
                <div className="space-y-2 mt-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Itens para Montagem:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {item.items.map((it: any, iidx: number) => (
                            <div
                                key={iidx}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2"
                            >
                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-[10px]">
                                    {it.quantity}x
                                </span>
                                {it.description}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Accent decorativo */}
                <div className={`absolute top-0 right-0 w-24 h-24 rotate-45 translate-x-12 -translate-y-12 opacity-5 pointer-events-none ${
                    isShowcase ? 'bg-rose-500' : 'bg-orange-500'
                }`} />
            </div>
        </div>
    );
};

export default AssemblyCard;
