import React, { useMemo, useState } from 'react';
import { TechnicalCombobox } from './TechnicalCombobox';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

const SIMPLE_CHOICE_DROPDOWN_LIMIT = 8;
const MIN_CHOICE_SEARCH_CHARACTERS = 2;
const MAX_CHOICE_SEARCH_RESULTS = 5;
const CHOICE_SEARCH_DEBOUNCE_MS = 300;

type Props = {
  field: TechnicalFieldDefinition;
  value: any;
  disabled?: boolean;
  isInvalid?: boolean;
  onChange: (value: any) => void;
};

export const TechnicalFieldInput: React.FC<Props> = ({
  field,
  value,
  disabled,
  isInvalid,
  onChange,
}) => {
  const type = field.dataType || 'list';
  const maxLength = 120;
  if (type === 'text_short' || type === 'text') {
    const isMarca = /^marca$/i.test(field.name.trim());
    const isModelo = /^modelo$/i.test(field.name.trim());
    const isLinha = /^linha$/i.test(field.name.trim());
    const placeholder = isMarca
      ? 'Digite a marca'
      : isModelo
        ? 'Digite o modelo'
        : isLinha
          ? 'Digite a linha'
          : undefined;

    return (
      <input
        type="text"
        value={value ?? ''}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
      />
    );
  }
  if (type === 'text_long') {
    return (
      <textarea
        value={value ?? ''}
        maxLength={4000}
        rows={4}
        placeholder="Digite a descrição detalhada"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400"
      />
    );
  }
  if (type === 'integer' || type === 'number' || type === 'weight') {
    const isLugares = /lugar(es)?/i.test(field.name);
    return (
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={15}
        placeholder={
          type === 'weight'
            ? 'Informe o peso em quilogramas'
            : isLugares
            ? 'Digite o número de quantidades'
            : /porta|gaveta/i.test(field.name)
              ? 'Insira a quantidade de portas'
              : 'Insira um número inteiro'
        }
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const rawValue = e.target.value;
          if (rawValue === '') {
            onChange('');
            return;
          }
          if (!/^\d+$/.test(rawValue)) return;
          const numeric = Number(rawValue);
          if (!Number.isSafeInteger(numeric)) return;
          onChange(numeric);
        }}
        className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
      />
    );
  }
  if (type === 'decimal' || type === 'measure') {
    return (
      <DecimalInput
        value={value}
        decimalPlaces={type === 'decimal' ? field.decimalPlaces ?? 2 : 2}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }
  if (type === 'percentage') {
    return <PercentageInput value={value} disabled={disabled} onChange={onChange} />;
  }
  if (type === 'boolean') {
    return (
      <select
        value={value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === '' ? '' : event.target.value === 'true')}
        className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100"
      >
        <option value="">Selecione</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </select>
    );
  }
  const usesSimpleChoiceDropdown =
    field.options.length > 0 && field.options.length <= SIMPLE_CHOICE_DROPDOWN_LIMIT;

  if (type === 'radio' || type === 'list') {
    if (usesSimpleChoiceDropdown) {
      return <ChoiceDropdown options={field.options} value={value} disabled={disabled} onChange={onChange} />;
    }
    return (
      <ChoiceSearch
        options={field.options}
        value={value}
        disabled={disabled}
        multiple={false}
        onChange={onChange}
      />
    );
  }
  if (type === 'multi_select') {
    const selected = Array.isArray(value)
      ? value
      : value
        ? String(value)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
    return (
      <ChoiceSearch
        options={field.options}
        value={selected}
        disabled={disabled}
        multiple
        onChange={onChange}
      />
    );
  }
  return (
    <TechnicalCombobox
      fieldName={field.name}
      value={Array.isArray(value) ? value.join(', ') : (value ?? '')}
      options={field.options}
      isInvalid={isInvalid}
      disabled={disabled}
      onChange={onChange}
    />
  );
};

function DecimalInput({
  value,
  decimalPlaces,
  disabled,
  onChange,
}: {
  value: any;
  decimalPlaces: 1 | 2 | 3;
  disabled?: boolean;
  onChange: (value: any) => void;
}) {
  const [draft, setDraft] = useState(() => formatDecimal(value, decimalPlaces));
  const lastEmittedValue = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (lastEmittedValue.current !== null && Number(value) === lastEmittedValue.current) {
      lastEmittedValue.current = null;
      return;
    }
    setDraft(formatDecimal(value, decimalPlaces));
  }, [value, decimalPlaces]);

  const handleMaskedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace('.', ',');
    if (!raw) {
      setDraft('');
      onChange('');
      return;
    }
    const precisionPattern = new RegExp(`^\\d*(?:,\\d{0,${decimalPlaces}})?$`);
    if (!precisionPattern.test(raw)) return;
    setDraft(raw);
    if (raw.endsWith(',')) return;
    const numeric = Number(raw.replace(',', '.'));
    if (!Number.isFinite(numeric)) return;
    lastEmittedValue.current = numeric;
    onChange(numeric);
  };

  const handleBlur = () => {
    const numeric = Number(draft.replace(',', '.'));
    if (!draft || !Number.isFinite(numeric)) return;
    const formatted = formatDecimal(numeric, decimalPlaces);
    setDraft(formatted);
    lastEmittedValue.current = numeric;
    onChange(numeric);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      maxLength={18}
      placeholder={formatDecimal(0, decimalPlaces)}
      value={draft}
      disabled={disabled}
      onChange={handleMaskedChange}
      onBlur={handleBlur}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600"
    />
  );
}

function formatDecimal(value: any, decimalPlaces: 1 | 2 | 3): string {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(decimalPlaces).replace('.', ',') : '';
}

function PercentageInput({
  value,
  disabled,
  onChange,
}: {
  value: any;
  disabled?: boolean;
  onChange: (value: any) => void;
}) {
  const [draft, setDraft] = useState(() => String(value ?? '').replace('.', ','));

  React.useEffect(() => {
    setDraft(String(value ?? '').replace('.', ','));
  }, [value]);

  const handleBlur = () => {
    if (!draft) return;
    const numeric = Number(draft.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric > 100) return;
    setDraft(String(numeric).replace('.', ','));
    onChange(numeric);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      maxLength={6}
      value={draft}
      disabled={disabled}
      placeholder="0 a 100"
      onChange={(event) => {
        const raw = event.target.value.replace('.', ',');
        if (raw === '') {
          setDraft('');
          onChange('');
          return;
        }
        if (!/^\d{0,3}(?:,\d{0,2})?$/.test(raw)) return;
        const numeric = Number(raw.replace(',', '.'));
        if (!Number.isFinite(numeric)) return;
        if (numeric > 100) return;
        setDraft(raw);
        if (!raw.endsWith(',')) onChange(numeric);
      }}
      onBlur={handleBlur}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100"
    />
  );
}

function ChoiceDropdown({
  options,
  value,
  disabled,
  onChange,
}: {
  options: readonly { id?: string; value: string }[];
  value: string | string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selectedValue = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

  return (
    <select
      value={selectedValue}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100"
    >
      <option value="">Selecione uma opção</option>
      {options.map((option) => (
        <option key={option.id || option.value} value={option.value}>
          {option.value}
        </option>
      ))}
    </select>
  );
}

function ChoiceSearch({
  options,
  value,
  disabled,
  multiple,
  onChange,
}: {
  options: readonly { id?: string; value: string }[];
  value: string | string[];
  disabled?: boolean;
  multiple: boolean;
  onChange: (v: any) => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const searchRef = React.useRef<HTMLDivElement>(null);
  const selected = (Array.isArray(value) ? value : [value].filter(Boolean)).filter(
    (item) => normalizeSearchTerm(String(item)) !== normalizeSearchTerm('Não se aplica')
  );
  const term = normalizeSearchTerm(query);
  React.useEffect(() => {
    if (term.length < MIN_CHOICE_SEARCH_CHARACTERS) {
      setDebouncedTerm('');
      return;
    }

    const timeoutId = window.setTimeout(
      () => setDebouncedTerm(term),
      CHOICE_SEARCH_DEBOUNCE_MS
    );
    return () => window.clearTimeout(timeoutId);
  }, [term]);

  const isSearchReady = term.length >= MIN_CHOICE_SEARCH_CHARACTERS && debouncedTerm === term;
  const displayValue = query || selected.join(', ');
  const matchingOptions = useMemo(
    () =>
      isSearchReady
        ? options.filter((option) => normalizeSearchTerm(option.value).includes(debouncedTerm))
        : [],
    [options, debouncedTerm, isSearchReady]
  );
  const filtered = matchingOptions.slice(0, MAX_CHOICE_SEARCH_RESULTS);
  const isSelected =
    term.length === 0
      ? selected.length > 0
      : isSearchReady && selected.some((item) => normalizeSearchTerm(item) === debouncedTerm);

  React.useEffect(() => {
    const closeSuggestions = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setQuery('');
    };
    document.addEventListener('mousedown', closeSuggestions);
    return () => document.removeEventListener('mousedown', closeSuggestions);
  }, []);

  return (
    <div ref={searchRef} className="relative space-y-2">
      <div className="relative">
        <input
          value={displayValue}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite pelo menos 2 caracteres para pesquisar..."
          className={`w-full border-b-2 bg-transparent py-2 pr-8 text-xs outline-none focus:border-blue-600 ${isSelected ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-slate-300'}`}
        />
        {isSelected && (
          <i
            className="bi bi-check-lg absolute right-1 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            aria-label="Opção selecionada"
          />
        )}
      </div>
      {term.length >= MIN_CHOICE_SEARCH_CHARACTERS && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {!isSearchReady ? (
            <span className="text-[10px] text-slate-400">Pesquisando...</span>
          ) : filtered.map((option) =>
            multiple ? (
              <label key={option.id || option.value} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.includes(option.value)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selected, option.value]
                        : selected.filter((selectedValue) => selectedValue !== option.value)
                    )
                  }
                />
                <span>{option.value}</span>
              </label>
            ) : (
              <button
                key={option.id || option.value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(option.value);
                  setQuery('');
                }}
                className="w-full rounded px-1 py-0.5 text-left text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
              >
                {option.value}
              </button>
            )
          )}
          {isSearchReady && filtered.length === 0 && (
            <span className="text-[10px] text-slate-400">Nenhuma opção encontrada.</span>
          )}
          {isSearchReady && matchingOptions.length > MAX_CHOICE_SEARCH_RESULTS && (
            <span className="border-t border-slate-100 pt-1 text-[10px] text-slate-400 dark:border-slate-700">
              Mostrando 5 resultados. Refine a busca para ver outros.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
