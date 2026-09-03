import React from "react";

interface NfeEnvironmentSelectorProps {
    environment: 1 | 2;
    onSelect: (env: 1 | 2) => void;
}

export const NfeEnvironmentSelector: React.FC<NfeEnvironmentSelectorProps> = ({
    environment,
    onSelect
}) => {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ambiente de Destino</label>
            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => onSelect(2)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        environment === 2 
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                >
                    <div>
                        <p className="text-xs font-black uppercase">Homologação</p>
                        <p className="text-[10px] opacity-75">Testes & Simulação</p>
                    </div>
                    {environment === 2 && <i className="bi bi-check-circle-fill text-blue-600 text-lg" />}
                </button>

                <button
                    type="button"
                    onClick={() => onSelect(1)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between opacity-60 cursor-not-allowed ${
                        environment === 1 
                            ? 'border-emerald-600 bg-emerald-50/50' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                    title="Requer certificado A-1 configurado no servidor"
                    disabled
                >
                    <div>
                        <p className="text-xs font-black uppercase">Produção</p>
                        <p className="text-[10px] text-amber-500 font-bold">Bloqueado (Falta .pfx)</p>
                    </div>
                    <i className="bi bi-lock-fill text-slate-400 text-lg" />
                </button>
            </div>
        </div>
    );
};
