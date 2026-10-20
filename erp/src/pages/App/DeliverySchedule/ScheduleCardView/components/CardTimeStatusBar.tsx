import React from 'react';
import Order from '../../../../types/order.type';
import { formatDate } from '../../../../utils/formatters';
import type { EffectiveScheduleResolution } from '../../../../../../../shared-utils/commercialScheduling';
import { getStatusIcon } from './cardViewHelpers';

interface CardTimeStatusBarProps {
  order: Order;
  displayTime: string;
  cls: any;
  currentStatus: any;
  scheduleRes: EffectiveScheduleResolution;
}

export const CardTimeStatusBar: React.FC<CardTimeStatusBarProps> = ({
  order,
  displayTime,
  cls,
  currentStatus,
  scheduleRes,
}) => {
  const scheduling = order.shipping?.scheduling;
  const isUsingAlternative = scheduleRes.isUsingAlternative;
  const activeOption = scheduleRes.effective;

  return (
    <div
      className={`px-3.5 py-2.5 border-b dark:border-slate-800 flex justify-between items-center transition-colors ${cls.headerBg}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-black text-xs sm:text-sm tracking-tight flex items-center text-slate-800 dark:text-slate-200">
          <i className={`bi bi-clock-fill mr-1.5 ${cls.timeText}`} />
          {displayTime}
        </span>
        {isUsingAlternative && activeOption && (
          <span className="text-[9px] font-black text-amber-800 dark:text-amber-200 uppercase px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 rounded-md border border-amber-300 dark:border-amber-700">
            {activeOption.formattedDate}
          </span>
        )}
        {!isUsingAlternative && scheduleRes.alternatives.length > 0 && (
          <span
            className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
            title={scheduleRes.alternativesSummaryText}
          >
            +{scheduleRes.alternatives.length} alt.
          </span>
        )}
        {scheduling?.dateType === 'range' && scheduling?.endDate && !isUsingAlternative && (
          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900/30">
            Até {formatDate(scheduling.endDate)}
          </span>
        )}
      </div>

      <div className="relative">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
            order.status === 'fulfilled'
              ? 'bg-emerald-500 text-white border-emerald-400'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          <i
            className={`bi ${getStatusIcon(order.status || 'draft')} ${
              order.status === 'fulfilled' ? 'text-white' : `text-${currentStatus.color}-500`
            } text-[9px]`}
          />
          <span className="text-[9px] font-black uppercase tracking-wider">
            {currentStatus.label}
          </span>
        </div>
      </div>
    </div>
  );
};
