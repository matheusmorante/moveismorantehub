import { useState } from 'react';
import type VariationType from '../../../types/variation.type';
import { normalizeSearchTerm } from '../../../utils/textUtils';
import { getCharacteristicSubtitle, isChoiceCharacteristicType, normalizeManagedCharacteristicType } from '../domain/characteristicFormRules';
import { isFactoryDefaultCharacteristicName } from '../../../../../../shared-utils/characteristicFormRules';

export interface AttributeCardProps {
  readonly attribute: VariationType;
  readonly onEdit: (attribute: VariationType) => void;
  readonly onManageOptions: (attribute: VariationType) => void;
  readonly onDelete: (attribute: VariationType) => void;
}

export function AttributeCard({ attribute, onEdit, onManageOptions, onDelete }: AttributeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteTooltipOpen, setDeleteTooltipOpen] = useState(false);
  const isFactoryDefault = isFactoryDefaultCharacteristicName(attribute.name);
  const hasChoiceOptions = isChoiceCharacteristicType(normalizeManagedCharacteristicType(attribute.dataType));
  const deleteTooltipId = `factory-default-characteristic-${attribute.id ?? normalizeSearchTerm(attribute.name)}`;

  return (
    <article
      data-attribute-name={normalizeSearchTerm(attribute.name)}
      className="flex min-h-12 items-center gap-3 border-b border-slate-100 py-2.5 last:border-b-0 dark:border-slate-800"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`truncate text-sm font-medium ${attribute.active === false ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {attribute.name}
          </span>
          {attribute.active === false && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Inativa
            </span>
          )}
          <span className="text-xs text-slate-500">{getCharacteristicSubtitle(attribute)}</span>
        </div>
      </div>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          aria-label={`Abrir ações da característica ${attribute.name}`}
          aria-expanded={menuOpen}
        >
          <i className="bi bi-three-dots-vertical" aria-hidden="true" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-30 w-48 bg-white p-1 shadow-xl dark:bg-slate-900">
            {hasChoiceOptions && (
              <button type="button" onClick={() => { setMenuOpen(false); onManageOptions(attribute); }} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                Gerenciar opções
              </button>
            )}
            <button type="button" onClick={() => { setMenuOpen(false); onEdit(attribute); }} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
              Editar característica
            </button>
            <div
              className="relative"
              onMouseEnter={() => isFactoryDefault && setDeleteTooltipOpen(true)}
              onMouseLeave={() => setDeleteTooltipOpen(false)}
            >
              <button
                type="button"
                aria-disabled={isFactoryDefault}
                aria-describedby={isFactoryDefault && deleteTooltipOpen ? deleteTooltipId : undefined}
                onFocus={() => isFactoryDefault && setDeleteTooltipOpen(true)}
                onBlur={() => setDeleteTooltipOpen(false)}
                onClick={() => {
                  if (isFactoryDefault) {
                    setDeleteTooltipOpen(true);
                    return;
                  }
                  setMenuOpen(false);
                  onDelete(attribute);
                }}
                className={`w-full px-3 py-2 text-left text-xs dark:text-red-300 ${
                  isFactoryDefault
                    ? 'cursor-not-allowed text-red-700/50 dark:text-red-300/50'
                    : 'text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30'
                }`}
              >
                Excluir característica
              </button>
              {isFactoryDefault && deleteTooltipOpen && (
                <span
                  id={deleteTooltipId}
                  role="tooltip"
                  className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-xl"
                >
                  Característica padrão; não pode ser apagada.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
