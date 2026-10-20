import React from 'react';
import { Drill } from '@/components/shared/DrillIcon';

interface LinkedAssemblyOverlayProps {
  assemblyItems: any[];
}

export const LinkedAssemblyOverlay: React.FC<LinkedAssemblyOverlayProps> = ({ assemblyItems }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div className="absolute -top-3 -right-3 z-[60]">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        className="bg-rose-600 text-white w-16 h-16 rounded-full border-4 border-white dark:border-slate-950 shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        title="Ver itens de montagem"
      >
        <Drill className="w-6 h-6 text-white" />
      </button>

      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-4 animate-slide-up-custom overflow-hidden">
          <div className="flex items-center gap-2 mb-3 border-b pb-2 dark:border-slate-800">
            <Drill className="w-4 h-4 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Produtos para Montagem
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {assemblyItems.map((item: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-800/50 px-2 py-1.5 rounded-xl"
              >
                <span className="text-[10px] font-black text-rose-700 dark:text-rose-400">
                  {item.quantity}x
                </span>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">
                  {item.description}
                </span>
              </div>
            ))}
            {assemblyItems.length === 0 && (
              <p className="text-[10px] text-slate-400 font-bold uppercase py-2">
                Consultar informações no pedido
              </p>
            )}
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-600/5 rotate-45 translate-x-8 -translate-y-8" />
        </div>
      )}
    </div>
  );
};
