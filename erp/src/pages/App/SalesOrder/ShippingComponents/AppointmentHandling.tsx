import React from 'react';
import type Item from '@/pages/types/items.type';
import { useSettings } from '@/pages/utils/settingsService';
import { requiresAssemblyResponsible } from '../../../../../../shared-utils/orderHandlingRules';
import { HandlingSelect } from '../ItemsTable/HandlingSelect';

export type AppointmentHandlingValue = {
  handlingType: string;
  assemblyResponsible?: Item['assemblyResponsible'];
};

interface Props {
  item: Item;
  deliveryMethod: 'delivery' | 'pickup';
  value: AppointmentHandlingValue;
  onChange: (value: AppointmentHandlingValue) => void;
  handlingError?: string;
  assemblyError?: string;
  disabled?: boolean;
}

export const AppointmentHandling: React.FC<Props> = ({
  item, deliveryMethod, value, onChange, handlingError, assemblyError, disabled = false,
}) => {
  const settings = useSettings();
  if (item.itemType === 'service' || item.isComboItem) return null;

  const options = (deliveryMethod === 'pickup'
    ? settings.pickupHandlingOptions
    : settings.deliveryHandlingOptions) || [];
  const needsResponsible = requiresAssemblyResponsible(value.handlingType, deliveryMethod);
  const visibleHandlingError = disabled ? undefined : handlingError;
  const visibleAssemblyError = disabled ? undefined : assemblyError;

  return (
    <div className={`grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 ${needsResponsible ? 'sm:grid-cols-2' : ''}`}>
      <div className="min-w-0" title={visibleHandlingError || undefined}>
        <span className={`block text-xs font-medium md:hidden ${disabled ? 'text-slate-400 dark:text-slate-500' : visibleHandlingError ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
          Manuseio {!disabled && <span className="text-red-500" aria-hidden="true">*</span>}
        </span>
        <HandlingSelect
          options={options}
          value={value.handlingType}
          error={visibleHandlingError}
          title={visibleHandlingError}
          disabled={disabled}
          ariaLabel={`Manuseio de ${item.description}`}
          useViewportMenu
          className={`w-full appearance-none border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-2 py-2 text-[13px] font-semibold text-slate-800 outline-none transition-colors focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 ${disabled ? 'border-b-slate-200 dark:border-b-slate-700' : visibleHandlingError ? 'border-b-red-500' : 'border-b-slate-200 focus:border-b-blue-600 dark:border-b-slate-700 dark:focus:border-b-blue-500'}`}
          onChange={(handlingType) => onChange({
            handlingType,
            assemblyResponsible: requiresAssemblyResponsible(handlingType, deliveryMethod)
              ? value.assemblyResponsible
              : '',
          })}
        />
      </div>
      {needsResponsible && (
        <label className={`min-w-0 text-xs font-medium ${disabled ? 'text-slate-400 dark:text-slate-500' : visibleAssemblyError ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
          Responsável pela montagem
          <select
            aria-invalid={Boolean(visibleAssemblyError)}
            title={visibleAssemblyError || undefined}
            disabled={disabled}
            value={value.assemblyResponsible || ''}
            onChange={(event) => onChange({
              ...value,
              assemblyResponsible: event.target.value as Item['assemblyResponsible'],
            })}
            className={`mt-1 w-full border-x-0 border-t-0 border-b-2 rounded-none bg-transparent px-2 py-2 text-[13px] font-semibold text-slate-800 outline-none transition-colors focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 ${disabled ? 'border-b-slate-200 dark:border-b-slate-700' : visibleAssemblyError ? 'border-b-red-500' : 'border-b-slate-200 focus:border-b-blue-600 dark:border-b-slate-700 dark:focus:border-b-blue-500'}`}
          >
            <option value="">Selecione</option>
            <option value="Nossa equipe">Nossa equipe</option>
            <option value="Montador terceirizado">Montador terceirizado</option>
          </select>
        </label>
      )}
    </div>
  );
};
