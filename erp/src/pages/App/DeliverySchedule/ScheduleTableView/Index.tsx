import React, { useRef, useState, useEffect, useMemo } from "react";
import Order from "../../../types/order.type";
import TableCell from "../ScheduleTableViewComponents/TableCell";
import { getHour, calculateLanes, getStartAndEnd } from "../ScheduleTableViewComponents/laneUtils";
import { getSettings } from '@/pages/utils/settingsService';
import { ORDER_TYPE_COLOR_OPTIONS } from "../../../utils/orderTypeColorUtils";

interface Props {
    schedule: Record<string, Order[]>;
    onOrderClick: (order: Order) => void;
    isReadOnly?: boolean;
    hasInitialScrolled?: React.MutableRefObject<boolean>;
}

const BASE_START_HOUR = 8;
const BASE_END_HOUR = 20;

const ScheduleTableView = ({ schedule, onOrderClick, isReadOnly, hasInitialScrolled }: Props) => {
    const settings = getSettings();
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollParentRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    
    const zoomState = useRef({
        scale: 1,
        startScale: 1,
        startDistance: 0,
        contentMidpoint: { x: 0, y: 0 },
        isPinching: false
    });

    const [tableHeight, setTableHeight] = useState(1000);

    // Calculate height based on lanes
    useEffect(() => {
        if (containerRef.current) {
            setTableHeight(containerRef.current.offsetHeight || 1000);
        }
    }, [schedule, isMobile]);

    const HOURS = useMemo(() => {
        const allOrders = Object.values(schedule).flat();
        let min = BASE_START_HOUR;
        let max = BASE_END_HOUR;

        allOrders.forEach(o => {
            const { start, end } = getStartAndEnd(o);
            if (start !== -1) {
                if (start < min) min = start;
                if (end > max) max = end;
            }
        });
        return Array.from({ length: Math.max(1, max - min) }, (_, i) => i + min);
    }, [schedule]);

    const applyTransform = () => {
        if (containerRef.current && scrollParentRef.current) {
            const s = zoomState.current.scale;
            containerRef.current.style.transform = `scale(${s}) translateZ(0)`;
            scrollParentRef.current.style.setProperty('--zoom', s.toString());
            
            // High-performance Manual Sticky
            const scrollX = scrollParentRef.current.scrollLeft;
            const stickyX = scrollX / s;
            const stickyElements = containerRef.current.querySelectorAll('.manual-sticky');
            stickyElements.forEach((el: any) => {
                el.style.transform = `translateX(${stickyX}px) translateZ(10px)`;
            });
        }
    };

    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2 && scrollParentRef.current) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            if (dist < 10) return; 

            const rect = scrollParentRef.current.getBoundingClientRect();
            const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
            const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

            zoomState.current.contentMidpoint = {
                x: (scrollParentRef.current.scrollLeft + midX) / zoomState.current.scale,
                y: (scrollParentRef.current.scrollTop + midY) / zoomState.current.scale
            };

            zoomState.current.startDistance = dist;
            zoomState.current.startScale = zoomState.current.scale;
            zoomState.current.isPinching = true;
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && zoomState.current.isPinching && scrollParentRef.current) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            
            const ratio = dist / zoomState.current.startDistance;
            const newScale = Math.min(5, Math.max(0.1, zoomState.current.startScale * ratio));
            
            const rect = scrollParentRef.current.getBoundingClientRect();
            const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
            const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

            zoomState.current.scale = newScale;
            applyTransform();

            scrollParentRef.current.scrollLeft = (zoomState.current.contentMidpoint.x * newScale) - midX;
            scrollParentRef.current.scrollTop = (zoomState.current.contentMidpoint.y * newScale) - midY;
        }
    };

    const handleTouchEnd = () => {
        zoomState.current.isPinching = false;
    };

    const handleWheel = (e: WheelEvent) => {
        if ((e.ctrlKey || e.metaKey) && scrollParentRef.current) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1.05 : 0.95;
            const newScale = Math.min(5, Math.max(0.1, zoomState.current.scale * delta));

            const rect = scrollParentRef.current.getBoundingClientRect();
            const midX = e.clientX - rect.left;
            const midY = e.clientY - rect.top;

            const contentX = (scrollParentRef.current.scrollLeft + midX) / zoomState.current.scale;
            const contentY = (scrollParentRef.current.scrollTop + midY) / zoomState.current.scale;

            zoomState.current.scale = newScale;
            applyTransform();

            scrollParentRef.current.scrollLeft = (contentX * newScale) - midX;
            scrollParentRef.current.scrollTop = (contentY * newScale) - midY;
        }
    };

    useEffect(() => {
        const handleLayout = () => {
            const parent = scrollParentRef.current;
            const container = containerRef.current;
            if (!parent || !container) return;

            const width = parent.offsetWidth;
            const height = parent.offsetHeight;
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            
            // Resetar transform temporariamente para medir o tamanho real se necessário
            // ou confiar que scrollWidth/scrollHeight retornam o tamanho intrínseco.
            const contentWidth = container.scrollWidth;
            
            // Para tabelas, priorizamos que ela ocupe a largura total disponível.
            // Não queremos que ela encolha para caber na altura, pois tabelas devem ser roladas verticalmente.
            let scale = (width - 10) / contentWidth;

            // No desktop, não queremos escala > 1.0 se o conteúdo for pequeno
            if (!mobile && scale > 1) scale = 1;
            
            // No mobile, garantimos um limite mínimo de escala para legibilidade
            if (mobile) scale = Math.max(scale, 0.4);

            zoomState.current.scale = scale;
            applyTransform();
        };

        const timer = setTimeout(handleLayout, 100);
        window.addEventListener('resize', handleLayout);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleLayout);
        };
    }, [schedule, HOURS, tableHeight]);

    const dragRef = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0
    });

    const handleMouseDown = (e: React.MouseEvent) => {
        // Prevent drag on interactive elements if needed, but for table it's fine
        if (!scrollParentRef.current) return;
        dragRef.current = {
            isDragging: true,
            startX: e.pageX - scrollParentRef.current.offsetLeft,
            startY: e.pageY - scrollParentRef.current.offsetTop,
            scrollLeft: scrollParentRef.current.scrollLeft,
            scrollTop: scrollParentRef.current.scrollTop
        };
        scrollParentRef.current.style.cursor = 'grabbing';
        scrollParentRef.current.style.userSelect = 'none';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current.isDragging || !scrollParentRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollParentRef.current.offsetLeft;
        const y = e.pageY - scrollParentRef.current.offsetTop;
        const walkX = (x - dragRef.current.startX) * 1.5;
        const walkY = (y - dragRef.current.startY) * 1.5;
        scrollParentRef.current.scrollLeft = dragRef.current.scrollLeft - walkX;
        scrollParentRef.current.scrollTop = dragRef.current.scrollTop - walkY;
    };

    const handleMouseUp = () => {
        dragRef.current.isDragging = false;
        if (scrollParentRef.current) {
            scrollParentRef.current.style.cursor = 'grab';
            scrollParentRef.current.style.removeProperty('user--select');
        }
    };

    useEffect(() => {
        if (hasInitialScrolled?.current) return;
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Find the closest date (today or future)
        const availableDates = Object.keys(schedule).sort();
        const targetDate = availableDates.find(d => d >= todayStr) || availableDates[0];

        if (!targetDate) return;

        setTimeout(() => {
            const element = document.getElementById(`table-date-${targetDate}`);
            if (element && scrollParentRef.current) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (hasInitialScrolled) hasInitialScrolled.current = true;
            }
        }, 500); // Give it a bit more time for the zoom/layout to settle
    }, [schedule, hasInitialScrolled]);

    useEffect(() => {
        const el = scrollParentRef.current;
        if (!el) return;

        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);
        el.addEventListener('touchcancel', handleTouchEnd);
        el.addEventListener('wheel', handleWheel, { passive: false });
        el.addEventListener('scroll', applyTransform);

        el.style.cursor = 'grab';

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('touchcancel', handleTouchEnd);
            el.removeEventListener('wheel', handleWheel);
            el.removeEventListener('scroll', applyTransform);
        };
    }, []);

    return (
        <div className={`flex flex-col bg-white dark:bg-slate-950 ${isMobile ? 'p-0 w-full h-[calc(100vh-140px)] overflow-hidden' : 'p-0 w-full h-[calc(100vh-280px)]'}`}>
            <div 
                ref={scrollParentRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`${isMobile ? 'rounded-none border-0 overflow-auto overscroll-contain' : 'rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-auto'} flex-1 bg-white dark:bg-slate-950 relative custom-scrollbar`}
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div 
                    style={{ 
                        width: '100%',
                        height: `calc(${tableHeight}px * var(--zoom, 1))`,
                        position: 'relative',
                    }}
                >
                    <div 
                        ref={containerRef}
                        className="absolute top-0 left-0 origin-top-left w-full"
                        style={{ 
                            willChange: 'transform'
                        }}
                    >
                         <table className="w-full min-w-full border-collapse table-auto">
                             <thead>
                                 <tr className="bg-slate-900 dark:bg-slate-950 text-white">
                                     <th className="manual-sticky p-4 w-[120px] min-w-[120px] text-[10px] font-black uppercase tracking-widest border-r border-slate-800 dark:border-slate-900 z-20 bg-slate-900 text-center">
                                         Data
                                     </th>
                                     {HOURS.map((h) => (
                                         <th 
                                             key={h} 
                                             className={`p-3 text-[10px] sm:text-xs font-black border-r border-slate-800 dark:border-slate-900 last:border-0 opacity-80 tracking-widest text-center min-w-[280px]`}
                                         >
                                             {String(h).padStart(2, '0')}:00
                                         </th>
                                     ))}
                                 </tr>
                             </thead>
                             <tbody>
                                 {Object.entries(schedule).map(([date, orders]) => {
                                     const lanes = calculateLanes(orders);
                                     return lanes.map((lane: Order[], laneIdx: number) => {
                                         const coveredUntil = { value: -1 };
                                         const isLastLaneOfDay = laneIdx === lanes.length - 1;
                                         const dateObj = new Date(date + "T00:00:00");
                                         
                                         return (
                                             <tr 
                                                 key={`${date}-${laneIdx}`} 
                                                 id={laneIdx === 0 ? `table-date-${date}` : undefined}
                                                 className={`h-52 group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors border-b border-slate-100 dark:border-slate-800 ${isLastLaneOfDay ? 'border-b-4 border-slate-200 dark:border-slate-800' : ''}`}
                                             >
                                                 {laneIdx === 0 && (
                                                     <td
                                                         rowSpan={lanes.length}
                                                         className="manual-sticky p-2 font-black text-center bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 align-middle z-10 w-[120px] min-w-[120px]"
                                                     >
                                                         <div className="flex flex-col items-center">
                                                             <span className="text-2xl text-slate-800 dark:text-slate-100 tracking-tighter">
                                                                 {dateObj.toLocaleDateString("pt-BR", { day: '2-digit' })}
                                                             </span>
                                                             <span className="text-[14px] uppercase text-blue-600 dark:text-blue-400 font-black mb-1">
                                                                 {dateObj.toLocaleDateString("pt-BR", { month: 'short' })}
                                                             </span>
                                                             <span className="text-[12px] text-slate-400 dark:text-slate-500 uppercase font-black">
                                                                 {dateObj.toLocaleDateString("pt-BR", { weekday: 'short' })}
                                                             </span>
                                                         </div>
                                                     </td>
                                                 )}
     
                                                 {HOURS.map((hour) => {
                                                     if (hour < coveredUntil.value) return null;
                                                     const order = lane.find((o: Order) => {
                                                         const { start } = getStartAndEnd(o);
                                                         return start === hour;
                                                     });

                                                     if (order) {
                                                         const { start, end } = getStartAndEnd(order);
                                                         const duration = end - start;
                                                         coveredUntil.value = end;

                                                         return (
                                                             <TableCell 
                                                                 key={hour} 
                                                                 order={order} 
                                                                 duration={duration} 
                                                                 onOrderClick={onOrderClick}
                                                             />
                                                         );
                                                     }

                                                     return <td key={hour} className="border-r border-slate-50 dark:border-slate-800 last:border-0" />;
                                                 })}
                                             </tr>
                                         );
                                     });
                                 })}
                             </tbody>
                         </table>
                    </div>
                </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 px-4 overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-6 min-w-max">
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
                    <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-6">
                        <div className="w-4 h-3 border border-dashed border-slate-400 bg-slate-50 rounded"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rascunho</span>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                @media (prefers-color-scheme: dark) {
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
                }
            `}} />
        </div>
    );
};

export default ScheduleTableView;
