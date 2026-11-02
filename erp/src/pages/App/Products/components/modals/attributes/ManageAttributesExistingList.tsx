import React from 'react';
import { isFactoryDefaultCharacteristicName } from '../../../../../../../../shared-utils/characteristicFormRules';
import type VariationType from '../../../../../types/variation.type';
import type { VariationOption } from '../../../../../types/variation.type';

interface ManageAttributesExistingListProps {
  readonly loading: boolean;
  readonly variations: VariationType[];
  readonly existingValInputs: Record<string, string>;
  readonly protectedDeleteTooltipId: string | null;
  readonly setExistingValInputs: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  readonly setProtectedDeleteTooltipId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  readonly onDeleteAttribute: (attributeId: string) => void;
  readonly onDeleteValue: (attribute: VariationType, option: VariationOption) => Promise<void>;
  readonly onAddValue: (attribute: VariationType) => Promise<void>;
}

const ManageAttributesExistingList: React.FC<ManageAttributesExistingListProps> = ({
  loading,
  variations,
  existingValInputs,
  protectedDeleteTooltipId,
  setExistingValInputs,
  setProtectedDeleteTooltipId,
  onDeleteAttribute,
  onDeleteValue,
  onAddValue,
}) => (
  <div className="lg:col-span-2 space-y-4">
    {loading ? (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center flex flex-col items-center justify-center gap-2">
        <i
          className="bi bi-arrow-clockwise animate-spin text-2xl text-blue-600"
          aria-hidden="true"
        />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Carregando características...
        </p>
      </div>
    ) : variations.length === 0 ? (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center text-slate-400 font-bold text-xs">
        Nenhuma característica encontrada.
      </div>
    ) : (
      variations.map((attr) => {
        const isFactoryDefault = isFactoryDefaultCharacteristicName(attr.name);
        const deleteTooltipId = `factory-default-characteristic-${attr.id}`;
        const deleteTooltipOpen = protectedDeleteTooltipId === attr.id;
        return (
          <div
            key={attr.id}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h5 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {attr.name}
                </h5>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {attr.options?.length || 0} valores vinculados
                </p>
              </div>
              <div
                className="relative"
                onMouseEnter={() => isFactoryDefault && setProtectedDeleteTooltipId(attr.id!)}
                onMouseLeave={() => setProtectedDeleteTooltipId((current) => current === attr.id ? null : current)}
              >
                <button
                  type="button"
                  aria-disabled={isFactoryDefault}
                  aria-describedby={isFactoryDefault && deleteTooltipOpen ? deleteTooltipId : undefined}
                  onFocus={() => isFactoryDefault && setProtectedDeleteTooltipId(attr.id!)}
                  onBlur={() => setProtectedDeleteTooltipId((current) => current === attr.id ? null : current)}
                  onClick={(event) => {
                    if (isFactoryDefault) {
                      event.preventDefault();
                      setProtectedDeleteTooltipId(attr.id!);
                      return;
                    }
                    onDeleteAttribute(attr.id!);
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                    isFactoryDefault
                      ? 'cursor-not-allowed text-slate-400/50 dark:text-slate-400/40'
                      : 'cursor-pointer text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                  }`}
                  title={isFactoryDefault ? undefined : 'Excluir característica'}
                  aria-label={`Excluir característica ${attr.name}`}
                >
                  <i className="bi bi-trash text-sm" aria-hidden="true" />
                </button>
                {isFactoryDefault && deleteTooltipOpen && (
                  <span
                    id={deleteTooltipId}
                    role="tooltip"
                    className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-xl"
                  >
                    Característica padrão; não pode ser apagada.
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {attr.options?.map((opt) => (
                <span
                  key={opt.id}
                  className="h-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] gap-1.5 py-0 px-2.5 rounded-full flex items-center shrink-0"
                >
                  {opt.value}
                  <button
                    type="button"
                    onClick={() => onDeleteValue(attr, opt)}
                    className="text-slate-400 hover:text-red-500 transition-colors flex items-center cursor-pointer"
                    title="Remover este valor"
                    aria-label={`Remover valor ${opt.value}`}
                  >
                    <i className="bi bi-x text-xs" aria-hidden="true" />
                  </button>
                </span>
              ))}
              {attr.options?.length === 0 && (
                <span className="text-slate-400 italic text-xs">
                  Sem valores cadastrados
                </span>
              )}
            </div>

            {/* Adição rápida de valor */}
            <div className="flex gap-2 max-w-sm pt-1">
              <input
                placeholder="Novo valor..."
                value={existingValInputs[attr.id!] || ''}
                onChange={(event) =>
                  setExistingValInputs((previous) => ({
                    ...previous,
                    [attr.id!]: event.target.value,
                  }))
                }
                onKeyDown={async (event) => {
                  if (event.key === 'Enter') {
                    await onAddValue(attr);
                  }
                }}
                aria-label={`Adicionar novo valor à característica ${attr.name}`}
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold dark:text-slate-300"
              />
              <button
                type="button"
                onClick={() => void onAddValue(attr)}
                className="bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
);

export default ManageAttributesExistingList;
