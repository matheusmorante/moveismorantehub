import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';
import { ORDER_TYPE_COLOR_OPTIONS } from '../../../utils/orderTypeColorUtils';

interface ScheduleTableLegendProps {
  settings: AppSettings;
}

export const ScheduleTableLegend: React.FC<ScheduleTableLegendProps> = ({ settings }) => (
  <>
    <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 px-4 overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-6 min-w-max">
        {ORDER_TYPE_COLOR_OPTIONS.filter(
          (opt) =>
            opt.value === settings.orderTypeColors.delivery ||
            opt.value === settings.orderTypeColors.pickup ||
            opt.value === settings.orderTypeColors.assistance
        ).map((opt) => {
          const type = Object.entries(settings.orderTypeColors).find(
            ([_, val]) => val === opt.value
          )?.[0];
          const label = type ? (settings.orderTypeLabels as any)[type] : opt.label;
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${opt.dotClass} shadow-sm`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {label}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-6">
          <div className="w-4 h-3 border border-dashed border-slate-400 bg-slate-50 rounded"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Rascunho
          </span>
        </div>
      </div>
    </div>
    <style
      dangerouslySetInnerHTML={{
        __html: `
              .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
              @media (prefers-color-scheme: dark) {
                  .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
              }
          `,
      }}
    />
  </>
);
