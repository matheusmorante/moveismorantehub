import React from 'react';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { isYesNoValueActive } from '@/pages/utils/technicalValuesService';

export interface YesNoPowerToggleProps {
  readonly field: TechnicalFieldDefinition;
  readonly value: unknown;
  readonly disabled?: boolean;
  readonly isInvalid?: boolean;
  readonly onChange: (value: any) => void;
}

/**
 * Componente intuitivo de botão com ícone de Ligar/Desligar (Power switch)
 * para características com escolha única binária de Sim ou Não.
 */
export const YesNoPowerToggle: React.FC<YesNoPowerToggleProps> = ({
  field,
  value,
  disabled = false,
  isInvalid = false,
  onChange,
}) => {
  const isOn = isYesNoValueActive(value);

  const handleToggle = () => {
    if (disabled) return;

    if (isOn) {
      // Desligar -> Emite "Não" (ou false para tipo boolean puro)
      const naoOption = field.options?.find((o) =>
        /^n[aã]o$/i.test((o.value || '').trim())
      )?.value;

      if (naoOption) {
        onChange(naoOption);
      } else if (field.dataType === 'boolean') {
        onChange(false);
      } else {
        onChange('Não');
      }
    } else {
      // Ligar -> Emite "Sim" (ou true para tipo boolean puro)
      const simOption = field.options?.find((o) =>
        /^sim$/i.test((o.value || '').trim())
      )?.value;

      if (simOption) {
        onChange(simOption);
      } else if (field.dataType === 'boolean') {
        onChange(true);
      } else {
        onChange('Sim');
      }
    }
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={`${field.name}: ${isOn ? 'Ligado' : 'Desligado'}`}
        disabled={disabled}
        onClick={handleToggle}
        className={`group relative w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all select-none ${
          disabled
            ? 'cursor-not-allowed opacity-60 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            : 'cursor-pointer'
        } ${
          isInvalid
            ? 'border-red-500 ring-1 ring-red-500'
            : isOn
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-400 dark:border-emerald-700 shadow-sm shadow-emerald-500/10'
              : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
              isOn
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            }`}
          >
            <i className="bi bi-power text-sm font-bold" />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <span
              className={`text-xs font-black uppercase tracking-wider truncate ${
                isOn
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {isOn ? 'Ligado' : 'Desligado'}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 leading-none">
              {isOn ? 'Sim' : 'Não'}
            </span>
          </div>
        </div>

        {/* Indicador visual de chave/switch deslizante */}
        <div
          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 relative ${
            isOn
              ? 'bg-emerald-500 dark:bg-emerald-600'
              : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out flex items-center justify-center ${
              isOn ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            <i
              className={`bi ${
                isOn ? 'bi-check text-emerald-600' : 'bi-x text-slate-400'
              } text-[10px] font-bold`}
            />
          </div>
        </div>
      </button>
    </div>
  );
};
