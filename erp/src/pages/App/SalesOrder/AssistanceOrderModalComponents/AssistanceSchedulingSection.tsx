import React from 'react';

interface AssistanceSchedulingSectionProps {
  scheduledDate: string;
  setScheduledDate: (val: string) => void;
  scheduledTime: string;
  setScheduledTime: (val: string) => void;
  errors: Record<string, string>;
}

const AssistanceSchedulingSection = ({
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  errors,
}: AssistanceSchedulingSectionProps) => (
  <div className="flex flex-col gap-4">
    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
      <i className="bi bi-calendar-event-fill text-amber-500" />
      Agendamento da Assistência
    </h3>

    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2 relative group/field">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Data
        </label>
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none transition-all ${errors.shipping_date ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-amber-400'}`}
        />
        {errors.shipping_date && (
          <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
            {errors.shipping_date}
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 relative group/field">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Horário
        </label>
        <input
          type="time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none transition-all ${errors.shipping_time ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-amber-400'}`}
        />
        {errors.shipping_time && (
          <div className="absolute left-0 -top-7 hidden group-hover/field:flex items-center px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
            {errors.shipping_time}
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AssistanceSchedulingSection;
