import React, { useRef, useState, useEffect } from "react";
import Order from "../../../types/order.type";
import TableCell from "../ScheduleTableViewComponents/TableCell";
import { OrderTypeFilter } from "../useDeliverySchedule";
import { calculateLanes, getHour } from "../ScheduleTableViewComponents/laneUtils";
import { getSettings } from '@/pages/utils/settingsService';
import { ORDER_TYPE_COLOR_OPTIONS } from "../../../utils/orderTypeColorUtils";

interface Props {
    schedule: Record<string, Order[]>;
    onOrderClick: (order: Order) => void;
    isReadOnly?: boolean;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00

const ScheduleTableView = ({ schedule, onOrderClick, isReadOnly }: Props) => {
    const settings = getSettings();
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleLayout = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const mobile = width < 1024;
            setIsMobile(mobile);

            if (mobile && containerRef.current) {
                // LARGURA DE BASE (5000px)
                const TABLE_WIDTH = 5000; 
                // ALTURA REAL DA TABELA
                const TABLE_HEIGHT = containerRef.current.scrollHeight;
                
                // Calculamos as duas escalas e pegamos a MENOR (para caber tudo nos dois eixos)
                const AVAILABLE_HEIGHT = height - 120; // Espaço reservado para cabeçalho do app
                const scaleW = (width - 10) / TABLE_WIDTH;
                const scaleH = AVAILABLE_HEIGHT / TABLE_HEIGHT;
                
                // Usamos a regra de "Fit to Screen" (Cabe o que for menor)
                setScale(Math.min(scaleW, scaleH));
            } else {
                setScale(1);
            }
        };

        handleLayout();
        const timer = setTimeout(handleLayout, 800);
        window.addEventListener('resize', handleLayout);
        return () => {
            window.removeEventListener('resize', handleLayout);
            clearTimeout(timer);
        };
    }, [schedule]);

    return (
        <div className={`flex flex-col bg-white dark:bg-slate-950 ${isMobile ? 'p-0 w-screen h-[calc(100vh-140px)] overflow-hidden' : 'p-3 h-[calc(100vh-220px)]'} transition-colors duration-300`}>
            {isMobile && (
                <div className="bg-slate-900 py-3 px-4 flex justify-between items-center border-b border-slate-800 shadow-xl z-20 shrink-0">
                    <span className="text-[12px] font-black text-white uppercase tracking-widest">
                        Painel Logístico Panorâmico
                    </span>
                    <span className="text-[10px] text-blue-400 font-bold">100% NA TELA</span>
                </div>
            )}

            <div 
                className={`${isMobile ? 'rounded-none border-0 overflow-hidden' : 'rounded-3xl border-2 border-slate-100 dark:border-slate-800 overflow-auto'} flex-1 shadow-2xl bg-white dark:bg-slate-950 relative custom-scrollbar`}
            >
                <div 
                    ref={containerRef}
                    className={`${isMobile ? 'origin-top-left absolute top-0 left-0' : 'w-full'}`}
                    style={{ 
                        width: isMobile ? '5000px' : '100%',
                        transform: isMobile ? `scale(${scale})` : 'none',
                        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <table className="w-full border-collapse" style={{ tableLayout: isMobile ? 'fixed' : 'auto' }}>
                        <thead>
                            <tr className="bg-slate-900 dark:bg-slate-950 text-white">
                                <th className="p-4 w-[250px] text-sm font-black uppercase tracking-widest border-r border-slate-800 dark:border-slate-900 sticky left-0 z-20 bg-slate-900 text-center">
                                    Dia / Calendário
                                </th>
                                {HOURS.map((h) => (
                                    <th 
                                        key={h} 
                                        className={`p-3 ${isMobile ? 'w-[350px]' : 'min-w-[380px]'} text-xs font-black border-r border-slate-800 dark:border-slate-900 last:border-0 opacity-80 tracking-widest text-center`}
                                    >
                                        {String(h).padStart(2, '0')}:00
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="">
                            {Object.entries(schedule).map(([date, orders]) => {
                                const lanes = calculateLanes(orders);

                                return lanes.map((lane: Order[], laneIdx: number) => {
                                    const coveredUntil = { value: -1 };
                                    const isLastLaneOfDay = laneIdx === lanes.length - 1;
                                    
                                    return (
                                        <tr 
                                            key={`${date}-${laneIdx}`} 
                                            className={`h-52 group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors border-b-2 border-slate-100 dark:border-slate-800 ${isLastLaneOfDay ? '!border-b-8 border-slate-900 dark:border-slate-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]' : ''}`}
                                        >
                                            {laneIdx === 0 && (
                                                <td
                                                    rowSpan={lanes.length}
                                                    className="p-6 font-black text-center bg-slate-50 dark:bg-slate-900 border-r-2 border-slate-100 dark:border-slate-800 align-middle sticky left-0 z-10"
                                                >
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-4xl text-slate-900 dark:text-slate-100 tracking-tighter">
                                                            {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: '2-digit' })}
                                                        </span>
                                                        <span className="text-[14px] uppercase text-blue-600 dark:text-blue-400 font-black mb-1">
                                                            {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { month: 'short' })}
                                                        </span>
                                                        <span className="text-[12px] text-slate-400 dark:text-slate-500 uppercase font-black">
                                                            {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: 'short' })}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {HOURS.map((hour) => {
                                                if (hour < coveredUntil.value) return null;
                                                const order = lane.find((o: Order) => getHour(o.shipping.scheduling.startTime || o.shipping.scheduling.time) === hour);
                                                if (order) {
                                                    const startHour = getHour(order.shipping.scheduling.startTime || order.shipping.scheduling.time);
                                                    const endHour = order.shipping.scheduling.type === 'range'
                                                        ? getHour(order.shipping.scheduling.endTime)
                                                        : startHour + 1;
                                                    const duration = Math.max(1, endHour - startHour);
                                                    coveredUntil.value = startHour + duration;
                                                    return <TableCell key={hour} order={order} duration={duration} onOrderClick={onOrderClick} />;
                                                }
                                                return <td key={hour} className="border-r border-slate-50 dark:border-slate-900 last:border-0" />;
                                            })}
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BARRA DE LEGENDAS FIXA */}
            <div className={`mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 px-4 ${isMobile ? 'pb-2' : ''}`}>
                <div className="flex flex-wrap items-center gap-4 md:gap-8">
                    {ORDER_TYPE_COLOR_OPTIONS.filter(opt =>
                        opt.value === settings.orderTypeColors.delivery ||
                        opt.value === settings.orderTypeColors.pickup ||
                        opt.value === settings.orderTypeColors.assistance
                    ).map(opt => {
                        const type = Object.entries(settings.orderTypeColors).find(([_, val]) => val === opt.value)?.[0];
                        const label = type ? (settings.orderTypeLabels as any)[type] : opt.label;
                        return (
                            <div key={opt.value} className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded ${opt.dotClass} shadow-sm`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                            </div>
                        );
                    })}
                    
                    {/* Legenda de Rascunho */}
                    <div className="flex items-center gap-2 ml-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                        <div className="w-4 h-3 border border-dashed border-slate-400 bg-slate-50 rounded"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rascunho</span>
                    </div>
                </div>

                {!isMobile && (
                    <div className="text-[10px] text-slate-300 dark:text-slate-700 font-black uppercase tracking-widest">
                        Visualização Panorâmica v2.1
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleTableView;
