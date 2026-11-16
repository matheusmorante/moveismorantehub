import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type Shipping from '../../../../types/Shipping.type';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { AlternativeScheduleFields } from './AlternativeScheduleFields';

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

type AlternativeScheduling = NonNullable<Shipping['scheduling']['alternatives']>[number];
type ScheduleOptionFields = Partial<
  Pick<Shipping['scheduling'], 'date' | 'endDate' | 'dateType' | 'type' | 'startTime' | 'endTime'>
>;

interface AlternativesAccordionProps {
  alternatives: NonNullable<Shipping['scheduling']['alternatives']>;
  isExpanded: boolean;
  expandedAlternativeId: string | null;
  errors: Record<string, string>;
  isScheduleReadOnly: boolean;
  onToggleExpanded: () => void;
  onToggleAlternative: (id: string) => void;
  onRemoveAlternative: (id: string) => void;
  onAddAlternative: () => void;
  onChangeAlternative: (id: string, fields: ScheduleOptionFields) => void;
}

export const AlternativesAccordion: React.FC<AlternativesAccordionProps> = ({
  alternatives,
  isExpanded,
  expandedAlternativeId,
  errors,
  isScheduleReadOnly,
  onToggleExpanded,
  onToggleAlternative,
  onRemoveAlternative,
  onAddAlternative,
  onChangeAlternative,
}) => {
  const activeAlternative = alternatives.find((option) => option.id === expandedAlternativeId);
  const activeAlternativeIndex = alternatives.findIndex((option) => option.id === expandedAlternativeId);
  const activeAlternativeId = activeAlternative?.id;
  const onToggleAlternativeRef = useRef(onToggleAlternative);
  onToggleAlternativeRef.current = onToggleAlternative;

  useEffect(() => {
    if (!activeAlternativeId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onToggleAlternativeRef.current(activeAlternativeId);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeAlternativeId]);

  return (
  <section className="flex flex-col gap-4 border-t border-slate-100 pt-4 dark:border-slate-800/50">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={onToggleExpanded}
        className="flex min-h-10 min-w-[220px] flex-1 items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <span className="shrink-0 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          Alternativas
        </span>
        {!isExpanded && alternatives.length > 0 && (
          <span className="ml-auto truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {alternatives.length}{' '}
            {alternatives.length === 1 ? 'programação' : 'programações'}
          </span>
        )}
      </button>
      {isExpanded && (
        <button
          type="button"
          disabled={isScheduleReadOnly}
          onClick={onAddAlternative}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-orange-950/20"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      )}
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Recolher datas alternativas' : 'Expandir datas alternativas'}
        onClick={onToggleExpanded}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>

    {isExpanded && (
      <div className="flex flex-col gap-3 animate-fade-in">
        {alternatives.length === 0 ? (
          <p className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
            Nenhuma programação alternativa adicionada.
          </p>
        ) : (
          alternatives.map((option, index) => {
            const expanded = expandedAlternativeId === option.id;
            const optionError =
              errors[`shipping_alternative_${option.id}_date`] ||
              errors[`shipping_alternative_${option.id}_time`] ||
              errors[`shipping_alternative_${option.id}_duplicate`];
            const optionHasError = Boolean(optionError);

            return (
              <div
                key={option.id}
                className={`overflow-hidden rounded-2xl border ${
                  optionHasError
                    ? 'border-red-400 dark:border-red-700'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-haspopup="dialog"
                    onClick={() => onToggleAlternative(option.id)}
                    aria-label={`${isScheduleReadOnly ? 'Ver' : 'Editar'} ${index + 1}ª alternativa`}
                    title={optionError || undefined}
                    className={`flex min-w-0 flex-1 items-center gap-3 text-left ${optionHasError ? 'text-red-700 dark:text-red-300' : ''}`}
                  >
                    <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-slate-400" />
                    <span className="shrink-0 text-xs font-black text-slate-700 dark:text-slate-200">
                      {index + 1}ª alternativa
                    </span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {summarizeOptionText(option)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${index + 1}ª alternativa`}
                    onClick={() => onRemoveAlternative(option.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    )}
    {activeAlternative && createPortal(
      <div
        className="fixed inset-0 z-[1000000] flex items-stretch justify-stretch bg-slate-950/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) onToggleAlternative(activeAlternative.id);
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="alternative-schedule-title"
          className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-slate-700"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6">
            <h2 id="alternative-schedule-title" className="text-base font-bold">
              {activeAlternativeIndex + 1}ª programação alternativa
            </h2>
            <button
              type="button"
              aria-label="Fechar programação alternativa"
              onClick={() => onToggleAlternative(activeAlternative.id)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <AlternativeScheduleFields
              key={activeAlternative.id}
              id={activeAlternative.id}
              scheduling={activeAlternative as AlternativeScheduling}
              errors={errors}
              isScheduleReadOnly={isScheduleReadOnly}
              onChange={(fields) => onChangeAlternative(activeAlternative.id, fields)}
            />
          </div>
          <footer className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800 sm:px-6">
            <button
              type="button"
              onClick={() => onToggleAlternative(activeAlternative.id)}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:ml-auto sm:w-auto"
            >
              Concluir
            </button>
          </footer>
        </section>
      </div>,
      document.body
    )}
  </section>
  );
};
