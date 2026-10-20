import React from 'react';
import Shipping from '../../../../types/Shipping.type';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

export const summarizeOptionText = (option: Shipping['scheduling']) => {
  const date = option.date
    ? option.date.split('-').reverse().join('/') +
      (option.dateType === 'range' && option.endDate
        ? ` a ${option.endDate.split('-').reverse().join('/')}`
        : '')
    : 'Data não definida';
  const start = option.startTime || (option.type === 'fixed' ? option.time : '');
  const time = start
    ? `${start}${option.endTime ? ` às ${option.endTime}` : ''}`
    : 'Horário não definido';
  return `${date} · ${time}`;
};

interface AlternativesAccordionProps {
  scheduling: Shipping['scheduling'];
  alternatives: NonNullable<Shipping['scheduling']['alternatives']>;
  expandedOptionId: string;
  errors: Record<string, string>;
  onToggleExpand: (id: string) => void;
  onRemoveAlternative: (id: string) => void;
  onAddAlternative: () => void;
}

export const AlternativesAccordion: React.FC<AlternativesAccordionProps> = ({
  scheduling,
  alternatives,
  expandedOptionId,
  errors,
  onToggleExpand,
  onRemoveAlternative,
  onAddAlternative,
}) => {
  const allOptions = [
    { id: 'primary', option: scheduling, primary: true },
    ...alternatives.map((opt) => ({ id: opt.id, option: opt, primary: false })),
  ];

  return (
    <>
      <div className="contents">
        {allOptions.map(({ id, option, primary }, index) => {
          const expanded = expandedOptionId === id;
          const optionHasError = primary
            ? Boolean(errors['shipping_date'] || errors['shipping_time'])
            : Boolean(
                errors[`shipping_alternative_${id}_date`] ||
                  errors[`shipping_alternative_${id}_time`] ||
                  errors[`shipping_alternative_${id}_duplicate`]
              );

          return (
            <div
              key={id}
              style={{ order: index * 2 }}
              className={`overflow-hidden border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${
                expanded ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => onToggleExpand(id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {index + 1}ª opção — {primary ? 'Principal' : 'Alternativa'}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {summarizeOptionText(option)}
                  </span>
                  {optionHasError && (
                    <span className="shrink-0 text-[10px] font-bold text-red-600">Erro</span>
                  )}
                </button>
                {!primary && (
                  <button
                    type="button"
                    aria-label={`Remover ${index + 1}ª opção`}
                    onClick={() => onRemoveAlternative(id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        style={{ order: (alternatives.length + 1) * 2 }}
        type="button"
        onClick={onAddAlternative}
        className="ml-1 inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-orange-950/20"
      >
        <Plus className="h-4 w-4" /> Adicionar alternativa
      </button>
    </>
  );
};
