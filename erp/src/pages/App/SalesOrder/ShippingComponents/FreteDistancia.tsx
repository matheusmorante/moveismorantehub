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

const FreteDistancia = ({
    value,
    distance,
    routeUrl,
    onChangeValue,
    onChangeDistance,
    onAutoCalculateDistance,
    autoCalculateValue,
    onToggleAutoCalculate,
    isCalculatingDistance,
    errors
}: FreteDistanciaProps) => {
    const isAuto = autoCalculateValue !== false;

    return (
        <div className="flex flex-col gap-2.5">
            {/* Barra superior de controle com botão Auto unificado */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Frete & Distância
                    </span>
                    {onToggleAutoCalculate && (
                        <button
                            type="button"
                            onClick={onToggleAutoCalculate}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                                isAuto
                                    ? 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 active:scale-95'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 border border-slate-200/60 dark:border-slate-700/60'
                            }`}
                            title={isAuto ? "Preenchimento automático ativado (clique para editar manualmente)" : "Preenchimento manual (clique para ativar cálculo automático)"}
                        >
                            <i className={`bi ${isCalculatingDistance ? 'bi-arrow-repeat animate-spin' : isAuto ? 'bi-lightning-charge-fill text-amber-300' : 'bi-lightning-charge'}`} />
                            <span>{isCalculatingDistance ? 'Calculando...' : 'Auto'}</span>
                        </button>
                    )}
                </div>

                <a
                    href={routeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    title="Ver rota no Google Maps"
                >
                    <i className="bi bi-geo-alt-fill text-xs" />
                    <span>Ver Rota</span>
                </a>
            </div>

            {/* Inputs de Valor do Frete e Distância KM */}
            <div className="flex h-fit flex-1 flex-row flex-wrap items-end gap-6 sm:gap-8">
                {/* Valor do Frete */}
                <div className="group relative flex w-44 max-w-full flex-none flex-col">
                    <label className="mb-1 ml-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Valor do Frete
                    </label>
                    <div className="relative">
                        <NumericFormat
                            className={`w-full border-b-2 bg-transparent px-2 py-2 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700 ${
                                isAuto
                                    ? 'opacity-80 cursor-not-allowed bg-slate-50/60 dark:bg-slate-800/30 rounded-t-lg'
                                    : ''
                            } ${errors['shipping_value'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`}
                            value={value === 0 ? "" : value}
                            allowNegative={false}
                            disabled={isAuto}
                            thousandSeparator="."
                            prefix={"R$ "}
                            decimalScale={2}
                            decimalSeparator=","
                            onFocus={(e: any) => !isAuto && e.target.select()}
                            onValueChange={(values: any) => !isAuto && onChangeValue(values.floatValue || 0)}
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
                    <label className="mb-1 ml-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Distância KM
                    </label>
                    <input
                        type="text"
                        disabled={isAuto}
                        className={`w-full border-b-2 border-slate-200 bg-transparent px-2 py-2 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 focus:border-blue-600 dark:border-slate-700 dark:text-slate-300 dark:placeholder:text-slate-700 dark:focus:border-blue-500 ${
                            isAuto
                                ? 'opacity-80 cursor-not-allowed bg-slate-50/60 dark:bg-slate-800/30 rounded-t-lg'
                                : ''
                        }`}
                        value={distance !== undefined ? distance.toString().replace('.', ',') : ''}
                        onChange={(e) => !isAuto && onChangeDistance(e.target.value)}
                        placeholder={isAuto ? "Automático" : "Ex: 5,5"}
                    />
                </div>
            </div>
        </div>
    );
};

export default FreteDistancia;


