import React from 'react';
import { OrderValidationStatItem } from '../orderActionValidationRules';

interface OrderActionValidationOverlayProps {
  readonly mousePos: { x: number; y: number };
  readonly validationStats: OrderValidationStatItem[];
}

export const OrderActionValidationOverlay: React.FC<OrderActionValidationOverlayProps> = ({
  mousePos,
  validationStats,
}) => {
  return (
    <div
      className="fixed z-[9999] w-72 pointer-events-none animate-fade-in translate-y-[-100%] mt-[-20px]"
      style={{
        left: mousePos.x - 144, // center horizontally relative to mouse
        top: mousePos.y,
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-5 ring-1 ring-black/5 flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <i className="bi bi-exclamation-triangle-fill text-sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">
              Campos Obrigatórios
            </span>
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
              Verificação de Bloqueio
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {validationStats.map((stat, sIdx) => (
            <div key={sIdx} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                  stat.valid
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-500 dark:bg-emerald-900/10'
                    : 'bg-rose-50 border-rose-100 text-rose-500 dark:bg-rose-900/10'
                }`}
              >
                <i className={`bi ${stat.valid ? 'bi-check2' : 'bi-x-lg'} text-[10px]`} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <i className={`bi ${stat.icon} text-[10px] text-slate-400`} />
                  <span
                    className={`text-[9px] font-black uppercase tracking-tight ${
                      stat.valid
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {stat.label}
                  </span>
                </div>
                {!stat.valid && stat.error && (
                  <span className="text-[7px] text-slate-400 font-medium truncate leading-none mt-0.5">
                    {stat.error}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-lg">
            Complete os dados para liberar
          </span>
        </div>
      </div>
    </div>
  );
};
