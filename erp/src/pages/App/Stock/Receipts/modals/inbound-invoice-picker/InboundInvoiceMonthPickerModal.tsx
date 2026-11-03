import { useEffect, useState } from 'react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseMonthValue(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  return year > 0 && month >= 1 && month <= 12
    ? { year, month }
    : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
}

export function formatInvoiceMonth(value: string) {
  const { year, month } = parseMonthValue(value);
  return `${MONTHS[month - 1]} de ${year}`;
}

interface InboundInvoiceMonthPickerModalProps {
  isOpen: boolean;
  value: string;
  onClose: () => void;
  onSelect: (month: string) => void;
}

export function InboundInvoiceMonthPickerModal({
  isOpen,
  value,
  onClose,
  onSelect,
}: InboundInvoiceMonthPickerModalProps) {
  const [year, setYear] = useState(() => parseMonthValue(value).year);
  const selected = parseMonthValue(value);

  useEffect(() => {
    if (isOpen) setYear(parseMonthValue(value).year);
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', closeOnEscape, true);
    return () => document.removeEventListener('keydown', closeOnEscape, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000002] flex items-center justify-center bg-slate-950/60 p-4">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
        aria-label="Fechar seleção de mês"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-invoice-month-title"
        className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <header className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 id="receipt-invoice-month-title" className="text-sm font-black text-slate-800 dark:text-slate-100">
            Escolher mês e ano
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar calendário"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>
        <div className="flex items-center justify-between py-4">
          <button
            type="button"
            onClick={() => setYear((current) => Math.max(1, current - 1))}
            disabled={year <= 1}
            aria-label={`Ano anterior: ${year - 1}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="text-lg font-black text-slate-800 dark:text-slate-100">{year}</span>
          <button
            type="button"
            onClick={() => setYear((current) => Math.min(9999, current + 1))}
            disabled={year >= 9999}
            aria-label={`Próximo ano: ${year + 1}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((monthName, index) => {
            const month = index + 1;
            const isSelected = month === selected.month && year === selected.year;
            return (
              <button
                key={monthName}
                type="button"
                onClick={() => onSelect(`${year}-${String(month).padStart(2, '0')}`)}
                aria-label={`${monthName} de ${year}`}
                aria-pressed={isSelected}
                className={`min-h-10 rounded-lg px-2 text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {monthName}
              </button>
            );
          })}
        </div>
        <footer className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        </footer>
      </section>
    </div>
  );
}
