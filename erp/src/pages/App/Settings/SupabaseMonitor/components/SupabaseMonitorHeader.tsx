import React from 'react';
import { PeriodType } from '../types/supabaseMonitor.types';

interface Props {
  period: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
}

export const SupabaseMonitorHeader: React.FC<Props> = ({ period, onPeriodChange }) => {
  return (
    <>
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Monitor do Supabase</h1>
          <p className="text-slate-500 text-sm mt-1">Telemetria agregada das chamadas feitas pelos clientes web do ERP.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {(['15m', '1h', '24h', '7d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                period === p
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Último(s) {p}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        Cobertura atual: chamadas instrumentadas pelos clientes web do ERP, enviadas em lotes a cada 5 minutos e dependentes de sessão autenticada. Catálogo digital, aplicativo mobile, chamadas feitas no servidor e volume em bytes (egress) não entram neste painel.
      </div>
    </>
  );
};
