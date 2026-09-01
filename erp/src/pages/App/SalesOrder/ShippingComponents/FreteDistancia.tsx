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
    <div className="flex h-fit flex-1 flex-row flex-wrap items-end gap-10">

        {/* Valor do Frete */}
        <div className="group relative flex w-44 max-w-full flex-none flex-col">
            <div className="mb-2 ml-1 flex h-5 w-full flex-nowrap items-center justify-between gap-2">
                <span className="whitespace-nowrap text-[10px] font-black uppercase leading-none tracking-widest text-slate-400 dark:text-slate-500">Valor do Frete</span>
                {onToggleAutoCalculate && (
                    <button
                        type="button"
                        onClick={onToggleAutoCalculate}
                        className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[9px] font-black uppercase leading-none tracking-wider text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title={autoCalculateValue ? "Cálculo automático de frete ativado" : "Cálculo automático de frete desativado"}
                    >
                        <i className={`bi ${autoCalculateValue ? 'bi-lightning-charge-fill' : 'bi-lightning-charge'}`} />
                        {autoCalculateValue ? 'Auto: ON' : 'Auto: OFF'}
                    </button>
                )}
            </div>
            <div className="relative">
                <NumericFormat
                    className={`w-full border-b-2 bg-transparent px-2 py-2 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700 ${errors['shipping_value'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`}
                    value={value === 0 ? "" : value}
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

        {/* Distância KM */}
        <div className="group relative flex w-44 max-w-full flex-none flex-col">
            <div className="mb-2 ml-1 flex h-5 w-full flex-nowrap items-center justify-between gap-2">
                <label className="whitespace-nowrap text-[10px] font-black uppercase leading-none tracking-widest text-slate-400 dark:text-slate-500">Distância KM</label>
                <a
                    href={routeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[9px] font-black uppercase leading-none tracking-wider text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Ver rota"
                >
                    <i className="bi bi-geo-alt-fill" />
                    <span className="hidden sm:inline">Rota</span>
                </a>
            </div>
            <input
                type="text"
                className="w-full border-b-2 border-slate-200 bg-transparent px-2 py-2 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 focus:border-blue-600 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-700 dark:focus:border-blue-500"
                value={distance !== undefined ? distance.toString().replace('.', ',') : ''}
                onChange={(e) => onChangeDistance(e.target.value)}
                placeholder="Ex: 5,5"
            />
        </div>
    </div>
);

export default FreteDistancia;


