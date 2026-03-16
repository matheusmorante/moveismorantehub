import React from "react";
import { NumericFormat as NumericFormatBase } from "react-number-format";
const NumericFormat = NumericFormatBase as any;
import { ValidationErrors } from "../../../utils/validations";

interface FreteDistanciaProps {
    value: number;
    distance?: number;
    routeUrl: string;
    onChangeValue: (val: number) => void;
    onChangeDistance: (val: string) => void;
    onAutoCalculateDistance?: () => void;
    autoCalculateValue?: boolean;
    onToggleAutoCalculate?: () => void;
    isCalculatingDistance?: boolean;
    errors: ValidationErrors;
}

const FreteDistancia = ({ value, distance, routeUrl, onChangeValue, onChangeDistance, onAutoCalculateDistance, autoCalculateValue, onToggleAutoCalculate, isCalculatingDistance, errors }: FreteDistanciaProps) => (
    <div className="flex-1 flex flex-col gap-8 h-fit">
        <div className="flex flex-col relative group">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                <div className="flex flex-wrap justify-between items-center w-full gap-2">
                    <span>Valor do Frete</span>
                    {onToggleAutoCalculate && (
                        <button
                            type="button"
                            onClick={onToggleAutoCalculate}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border ${autoCalculateValue
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-200'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            title={autoCalculateValue ? "Cálculo automático de frete ativado" : "Cálculo automático de frete desativado"}
                        >
                            <i className={`bi ${autoCalculateValue ? 'bi-lightning-charge-fill' : 'bi-lightning-charge'}`} />
                            {autoCalculateValue ? 'Auto: ON' : 'Auto: OFF'}
                        </button>
                    )}
                </div>
            </label>
            <div className="relative">
                <NumericFormat
                    className={`w-full bg-transparent border px-3 py-3 rounded-2xl transition-all text-sm font-bold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:text-slate-300 ${errors['shipping_value'] ? 'border-red-500 ring-4 ring-red-500/10 shadow-lg shadow-red-100 dark:shadow-red-900/10' : 'border-slate-100 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-500'}`}
                    value={value}
                    allowNegative={false}
                    thousandSeparator="."
                    prefix={"R$ "}
                    decimalScale={2}
                    decimalSeparator=","
                    onFocus={(e: any) => e.target.select()}
                    onValueChange={(values: any) => onChangeValue(values.floatValue || 0)}
                />
                {errors['shipping_value'] && (
                    <div className="absolute left-0 -top-8 hidden group-hover:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap">
                        {errors['shipping_value']}
                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                    </div>
                )}
            </div>
        </div>
        <div className="flex flex-col relative group">
            <div className="flex flex-wrap justify-between items-center mb-2 px-1 w-full gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Distância KM</label>
                <div className="flex items-center gap-2">
                    <a
                        href={routeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-[10px] font-black uppercase tracking-widest border border-blue-100/50 dark:border-blue-900/20"
                        title="Ver rota"
                    >
                        <i className="bi bi-geo-alt-fill" />
                        <span className="hidden sm:inline">Rota</span>
                    </a>
                </div>
            </div>
            <div className="relative">
                <input
                    type="text"
                    className="w-full bg-transparent border-0 border-b border-slate-100 dark:border-slate-800 px-1 py-3 focus:border-blue-600 dark:focus:border-blue-500 transition-all text-sm font-bold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:text-slate-300"
                    value={distance !== undefined ? distance.toString().replace('.', ',') : ''}
                    onChange={(e) => onChangeDistance(e.target.value)}
                    placeholder="Ex: 5,5"
                />
            </div>
        </div>
    </div>
);

export default FreteDistancia;
