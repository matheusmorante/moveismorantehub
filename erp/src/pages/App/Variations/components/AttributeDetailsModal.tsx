import { useMemo, useState } from 'react';
import type VariationType from '../../../types/variation.type';
import { normalizeSearchTerm } from '../../../utils/textUtils';
import {
  getCharacteristicFillTypeLabel,
  getCharacteristicSubtitle,
  isChoiceCharacteristicType,
} from '../domain/characteristicFormRules';

const VALUE_PREVIEW_LIMIT = 15;

interface AttributeDetailsModalProps {
  readonly attribute: VariationType;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function AttributeDetailsModal({
  attribute,
  isOpen,
  onClose,
}: AttributeDetailsModalProps) {
  const [showAll, setShowAll] = useState(false);
  const [valueSearch, setValueSearch] = useState('');

  const canAddOptions = isChoiceCharacteristicType(attribute.dataType);

  const filteredValues = useMemo(() => {
    const search = normalizeSearchTerm(valueSearch);
    if (!search) return attribute.options;
    return attribute.options.filter((option) =>
      normalizeSearchTerm(option.value).includes(search)
    );
  }, [attribute.options, valueSearch]);

  const visibleValues =
    valueSearch || showAll ? filteredValues : filteredValues.slice(0, VALUE_PREVIEW_LIMIT);
  const hiddenValueCount = Math.max(0, filteredValues.length - visibleValues.length);
  const hasManyValues = attribute.options.length > VALUE_PREVIEW_LIMIT;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs cursor-default"
        onClick={onClose}
        aria-label="Fechar detalhes"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`attribute-details-title-${attribute.id || attribute.name}`}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={`attribute-details-title-${attribute.id || attribute.name}`}
              className="text-xl font-black text-slate-800 dark:text-slate-100"
            >
              {attribute.name}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              Detalhes • {getCharacteristicSubtitle(attribute)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Fechar detalhes"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        {!canAddOptions ? (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <i className="bi bi-info-circle text-sm" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Esta característica é preenchida como{' '}
              <strong className="text-slate-800 dark:text-slate-100 font-black">
                {getCharacteristicFillTypeLabel(attribute.dataType)}
              </strong>{' '}
              diretamente na ficha do produto. Não utiliza lista pré-definida de opções.
            </p>
          </div>
        ) : (
          <>
            <div className="relative max-w-xl">
              <i
                className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                aria-hidden="true"
              />
              <input
                value={valueSearch}
                onChange={(event) => setValueSearch(event.target.value)}
                placeholder={`Buscar entre ${attribute.options.length} valores...`}
                aria-label={`Buscar valores de ${attribute.name}`}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {visibleValues.map((option) => (
                <span
                  key={option.id || option.value}
                  className="h-8 px-3 rounded-full flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {option.value}
                </span>
              ))}
              {filteredValues.length === 0 && (
                <span className="text-xs italic text-slate-400">Nenhum valor encontrado.</span>
              )}
            </div>

            {hasManyValues && !valueSearch && (
              <button
                type="button"
                onClick={() => setShowAll((current) => !current)}
                className="text-xs font-black text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                {showAll ? 'Mostrar menos' : `Mostrar mais ${hiddenValueCount}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
