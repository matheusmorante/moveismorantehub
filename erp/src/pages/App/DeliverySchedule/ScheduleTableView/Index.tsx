import React, { useMemo, useState } from 'react';
import Order from '../../../types/order.type';
import TableCell from '../ScheduleTableViewComponents/TableCell';
import { calculateLanes, getStartAndEnd } from '../ScheduleTableViewComponents/laneUtils';
import { getSettings } from '@/pages/utils/settingsService';
import { getLocalISODate } from '../../../utils/shared/formatters';
import { SchedulePendingOrdersBanner } from './SchedulePendingOrdersBanner';
import { ScheduleTableLegend } from './ScheduleTableLegend';
import { useScheduleTableZoomAndPan } from './useScheduleTableZoomAndPan';

interface Props {
  schedule: Record<string, Order[]>;
  onOrderClick: (order: Order) => void;
  isReadOnly?: boolean;
  hasInitialScrolled?: React.MutableRefObject<boolean>;
  pendingOrders?: Order[];
}

const BASE_START_HOUR = 8;
const BASE_END_HOUR = 20;

const ScheduleTableView = ({
  schedule,
  onOrderClick,
  hasInitialScrolled,
  pendingOrders = [],
}: Props) => {
  const settings = getSettings();
  const [isPendingOpen, setIsPendingOpen] = useState(false);

  const HOURS = useMemo(() => {
    const allOrders = Object.values(schedule).flat();
    let min = BASE_START_HOUR;
    let max = BASE_END_HOUR;

    allOrders.forEach((o) => {
      const { start, end } = getStartAndEnd(o);
      if (start !== -1) {
        if (start < min) min = start;
        if (end > max) max = end;
      }
    });
    return Array.from({ length: Math.max(1, max - min) }, (_, i) => i + min);
  }, [schedule]);

  const {
    containerRef,
    scrollParentRef,
    isMobile,
    tableHeight,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useScheduleTableZoomAndPan({ schedule, hours: HOURS, hasInitialScrolled });

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-950 ${isMobile ? 'p-0 w-full h-[calc(100vh-140px)] overflow-hidden' : 'p-0 w-full h-[calc(100vh-280px)]'}`}
    >
      <SchedulePendingOrdersBanner
        pendingOrders={pendingOrders}
        isPendingOpen={isPendingOpen}
        onToggleOpen={() => setIsPendingOpen((prev) => !prev)}
        onOrderClick={onOrderClick}
      />

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
              willChange: 'transform',
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
                      className="p-3 text-[10px] sm:text-xs font-black border-r border-slate-800 dark:border-slate-900 last:border-0 opacity-80 tracking-widest text-center min-w-[280px]"
                    >
                      {String(h).padStart(2, '0')}:00
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(schedule).map(([date, orders]) => {
                  const lanes = calculateLanes(orders);
                  const isToday = date === getLocalISODate();
                  return lanes.map((lane: Order[], laneIdx: number) => {
                    const coveredUntil = { value: -1 };
                    const isLastLaneOfDay = laneIdx === lanes.length - 1;
                    const dateObj = new Date(date + 'T00:00:00');

                    return (
                      <tr
                        key={`${date}-${laneIdx}`}
                        id={laneIdx === 0 ? `table-date-${date}` : undefined}
                        className={`h-52 group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors border-b border-slate-100 dark:border-slate-800 ${isLastLaneOfDay ? 'border-b-4 border-slate-200 dark:border-slate-800' : ''}`}
                      >
                        {laneIdx === 0 && (
                          <td
                            rowSpan={lanes.length}
                            className={`manual-sticky p-2 font-black text-center border-r align-middle z-10 w-[120px] min-w-[120px] ${
                              isToday
                                ? 'bg-blue-700 text-white border-blue-800 dark:bg-blue-800 dark:border-blue-600'
                                : 'bg-slate-50 text-slate-900 border-slate-100 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              {isToday ? (
                                <span className="text-xs font-black leading-snug text-white">
                                  Hoje, {dateObj.toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                  })}
                                </span>
                              ) : (
                                <>
                                  <span className="text-2xl tracking-tighter text-slate-800 dark:text-slate-100">
                                    {dateObj.toLocaleDateString('pt-BR', { day: '2-digit' })}
                                  </span>
                                  <span className="text-[14px] uppercase font-black mb-1 text-blue-600 dark:text-blue-400">
                                    {dateObj.toLocaleDateString('pt-BR', { month: 'short' })}
                                  </span>
                                  <span className="text-[12px] uppercase font-black text-slate-400 dark:text-slate-500">
                                    {dateObj.toLocaleDateString('pt-BR', { weekday: 'short' })}
                                  </span>
                                </>
                              )}
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

                          return (
                            <td
                              key={hour}
                              className="border-r border-slate-50 dark:border-slate-800 last:border-0"
                            />
                          );
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

      <ScheduleTableLegend settings={settings} />
    </div>
  );
};

export default ScheduleTableView;
