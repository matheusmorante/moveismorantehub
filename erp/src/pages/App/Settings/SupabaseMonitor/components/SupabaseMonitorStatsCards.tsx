import React from 'react';
import { GlobalStats } from '../types/supabaseMonitor.types';

interface Props {
  stats: GlobalStats;
}

export const SupabaseMonitorStatsCards: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-in">
      <StatCard title="Requisições Totais" value={stats.totalReqs} icon="bi-activity" color="blue" />
      <StatCard title="Total SELECTs" value={stats.selects} icon="bi-search" color="emerald" />
      <StatCard title="Total Writes" value={stats.writes} icon="bi-pencil-square" color="amber" />
      <StatCard title="Total Realtime" value={stats.realtime} icon="bi-lightning-charge" color="purple" />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <i className={`bi ${icon}`}></i>
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{value.toLocaleString()}</span>
    </div>
  );
}
