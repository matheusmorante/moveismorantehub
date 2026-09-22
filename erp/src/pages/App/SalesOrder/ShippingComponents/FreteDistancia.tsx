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
    autoCalculateValue?: boolean;
    onToggleAutoCalculateValue?: () => void;
    isCalculatingDistance?: boolean;
    errors: ValidationErrors;
}

const FreteDistancia = ({
    value,
    distance,
    routeUrl,
    onChangeValue,
    onChangeDistance,
    autoCalculateValue,
    onToggleAutoCalculateValue,
    isCalculatingDistance,
    errors
}: FreteDistanciaProps) => {
    const isValueAuto = autoCalculateValue !== false;

    const AutoToggle = ({ enabled, onClick, label }: { enabled: boolean; onClick?: () => void; label: string }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            aria-label={`${enabled ? 'Desligar' : 'Ligar'} cálculo automático de ${label}`}
            aria-pressed={enabled}
            title={`${enabled ? 'Desligar' : 'Ligar'} automático de ${label} • cálculo automático`}
            className={`absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${enabled ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400 hover:text-blue-600 dark:text-slate-500'}`}
        >
            <span className={`relative h-4 w-7 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </span>
            <i className={`bi bi-lightning-charge-fill text-xs ${enabled ? 'text-amber-500' : ''}`} aria-hidden="true" />
        </button>
    );

    return (
        <div className="flex flex-col gap-2.5">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Frete & Distância</span>

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
                            className={`w-full border-b-2 bg-transparent py-2 pl-2 pr-16 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700 ${
                                isValueAuto
                                    ? 'opacity-80 cursor-not-allowed bg-slate-50/60 dark:bg-slate-800/30 rounded-t-lg'
                                    : ''
                            } ${errors['shipping_value'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`}
                            value={value === 0 ? "" : value}
                            allowNegative={false}
                            disabled={isValueAuto}
                            thousandSeparator="."
                            prefix={"R$ "}
                            decimalScale={2}
                            decimalSeparator=","
                            onFocus={(e: any) => !isValueAuto && e.target.select()}
                            onValueChange={(values: any) => !isValueAuto && onChangeValue(values.floatValue || 0)}
                        />
                        <AutoToggle enabled={isValueAuto} onClick={onToggleAutoCalculateValue} label="valor do frete" />
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


