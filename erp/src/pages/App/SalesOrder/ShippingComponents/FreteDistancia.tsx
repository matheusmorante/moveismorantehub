import React from 'react';
import { ValidationErrors } from '../../../utils/sales/validations';
import CurrencyInput from '@/components/inputs/CurrencyInput';
import { DistanceInput } from '@/components/inputs/DistanceInput';

interface FreteDistanciaProps {
  title?: string;
  titleClassName?: string;
  freightLabel?: string;
  value: number;
  distance?: number;
  routeUrl?: string;
  onChangeValue: (val: number) => void;
  onChangeDistance: (val: string) => void;
  onAutoCalculateDistance?: () => void;
  isCalculatingDistance?: boolean;
  errors: ValidationErrors;
}

const FreteDistancia = ({
  title = 'Frete & Distância',
  titleClassName = 'text-sm font-black uppercase tracking-widest',
  freightLabel = 'Valor do Frete',
  value,
  distance,
  routeUrl,
  onChangeValue,
  onChangeDistance,
  onAutoCalculateDistance,
  isCalculatingDistance,
  errors,
}: FreteDistanciaProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`${titleClassName} text-slate-600 dark:text-slate-400`}>
          {title}
        </span>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onAutoCalculateDistance}
            disabled={!onAutoCalculateDistance || isCalculatingDistance}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:text-orange-800 disabled:cursor-wait disabled:opacity-60 dark:text-orange-400 dark:hover:text-orange-300"
            title="Consultar a rota, preencher a distância e calcular o frete automaticamente"
          >
            <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
            <span>Auto preencher</span>
          </button>
          {routeUrl && (
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
              title="Consultar rota no Google Maps"
            >
              <i className="bi bi-geo-alt-fill text-xs" />
              <span>Consultar rota no Google Maps</span>
            </a>
          )}
        </div>
      </div>

      {/* Inputs de Valor do Frete e Distância KM */}
      <div className="flex h-fit flex-1 flex-row flex-wrap items-end gap-4 sm:gap-6">
        {/* Valor do Frete */}
        <div className="group relative inline-grid w-fit max-w-full flex-none grid-cols-[max-content]">
          <div className="mb-1 flex min-w-0 items-center justify-between">
            <label className={`text-xs font-medium ${errors['shipping_value'] ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
              {freightLabel}
            </label>
            {distance !== undefined && distance >= 0 && distance < 5 && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Grátis (&lt; 5 km)
              </span>
            )}
          </div>
          <div className="relative w-full" title={errors['shipping_value'] || undefined}>
            <CurrencyInput
              value={value ?? 0}
              onChangeValue={onChangeValue}
              prefix="R$ "
              showBadge={false}
              size={1}
              error={Boolean(errors['shipping_value'])}
              className={`w-full min-w-0 border-b-2 bg-transparent py-2 pl-2 pr-2 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700 ${errors['shipping_value'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`}
            />
          </div>
        </div>

        {/* Distância KM */}
        <div className="group relative inline-grid w-fit max-w-full flex-none grid-cols-[max-content]">
          <label
            htmlFor="shipping-distance"
            className={`mb-1 text-xs font-medium ${errors['shipping_distance'] ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}
          >
            Distância KM{' '}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <div className="relative w-full" title={errors['shipping_distance'] || undefined}>
            <DistanceInput
              id="shipping-distance"
              name="shipping_distance"
              testID="shipping-distance-input"
              value={distance}
              onChangeValue={(val) => {
                onChangeDistance(
                  val !== null && val !== undefined
                    ? val.toFixed(1).replace('.', ',')
                    : ''
                );
              }}
              disabled={isCalculatingDistance}
              placeholder=""
              suffix=""
              showBadge={false}
              size={1}
              error={Boolean(errors['shipping_distance'])}
              aria-label="Distância em quilômetros (obrigatória)"
              className={`w-full !min-w-0 border-b-2 bg-transparent py-2 pl-2 pr-2 text-sm font-bold outline-none transition-colors placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-700 ${errors['shipping_distance'] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`}
            />
            {isCalculatingDistance && (
              <span className="sr-only" role="status">
                Calculando distância
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreteDistancia;
