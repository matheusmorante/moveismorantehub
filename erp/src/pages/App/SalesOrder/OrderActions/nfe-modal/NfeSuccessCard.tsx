import React, { useState } from "react";
import { NfeEmissionResult } from "@/pages/utils/nfe/nfeService";
import { formatAccessKey } from "@/pages/utils/nfe/nfeAccessKey";

interface NfeSuccessCardProps {
    result: NfeEmissionResult;
    onPrintDanfe: () => void;
}

export const NfeSuccessCard: React.FC<NfeSuccessCardProps> = ({
    result,
    onPrintDanfe
}) => {
    const [showXml, setShowXml] = useState(false);

    return (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <i className="bi bi-check-circle-fill text-lg" />
                <h4 className="text-xs font-black uppercase tracking-wider">Nota Fiscal Emitida com Sucesso!</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Número / Série:</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200">#{result.nfeNumber} (Série {result.series})</p>
                </div>
                <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Protocolo:</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{result.protocolNumber}</p>
                </div>
                <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Chave de Acesso:</span>
                    <p className="font-mono text-[11px] font-black text-slate-800 dark:text-slate-100 break-all select-all">
                        {formatAccessKey(result.accessKey || '')}
                    </p>
                </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40">
                <button
                    type="button"
                    onClick={onPrintDanfe}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <i className="bi bi-printer-fill" /> Imprimir DANFE
                </button>
                <button
                    type="button"
                    onClick={() => setShowXml(!showXml)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                    <i className="bi bi-filetype-xml" /> {showXml ? 'Ocultar XML' : 'Ver XML'}
                </button>
            </div>

            {showXml && (
                <div className="mt-3 p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[10px] max-h-48 overflow-y-auto select-all whitespace-pre-wrap">
                    {result.xml}
                </div>
            )}
        </div>
    );
};
