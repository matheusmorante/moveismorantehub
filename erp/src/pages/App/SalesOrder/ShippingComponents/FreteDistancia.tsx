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
    isCalculatingDistance,
    errors
}: FreteDistanciaProps) => {
    return (
        <div className="flex flex-col gap-2.5">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Frete & Distância</span>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onAutoCalculateDistance}
                        disabled={!onAutoCalculateDistance || isCalculatingDistance}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
                        title="Consultar a rota, preencher a distância e calcular o frete automaticamente"
                    >
                        <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
                        <span>Auto preencher</span>
                    </button>
                    <a
                        href={routeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
                        title="Consultar a distância manualmente no Google Maps"
                    >
                        <i className="bi bi-geo-alt-fill text-xs" />
                        <span>Consultar distância manualmente</span>
                    </a>
                </div>
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
                            className={`w-full border-b-2 bg-transparent py-2 pl-2 pr-2 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700 ${errors['shipping_value'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`}
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
                        <label className="mb-1 ml-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Distância KM <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            inputMode="decimal"
                            aria-label="Distância em quilômetros (obrigatória)"
                            aria-invalid={Boolean(errors['shipping_distance'])}
                            className={`w-full border-b-2 bg-transparent px-2 py-2 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 focus:border-blue-600 dark:text-slate-300 dark:placeholder:text-slate-700 dark:focus:border-blue-500 ${errors['shipping_distance'] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                            value={distance !== undefined ? distance.toString().replace('.', ',') : ''}
                            onChange={(e) => onChangeDistance(e.target.value)}
                            placeholder={isCalculatingDistance ? 'Calculando...' : 'Ex: 5,5'}
                        />
                        {isCalculatingDistance && <span className="sr-only" role="status">Calculando distância</span>}
                        {errors['shipping_distance'] && (
                            <p className="mt-1 text-[10px] font-semibold text-red-500">{errors['shipping_distance']}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FreteDistancia;


