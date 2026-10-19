import React, { useMemo, useState } from 'react';
import { TechnicalCombobox } from './TechnicalCombobox';
import { YesNoPowerToggle } from './YesNoPowerToggle';
import {
  isWeightCharacteristicName,
  isYesNoCharacteristic,
  TechnicalFieldDefinition,
} from '@/pages/utils/technicalValuesService';
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
  compact?: boolean;
  onChange: (value: any) => void;
};

export const TechnicalFieldInput: React.FC<Props> = ({
  field,
  value,
  disabled,
  isInvalid,
  compact = false,
  onChange,
}) => {
  let type = field.dataType || 'list';
  if (/^(marca|modelo|modelo\s*\/\s*linha|linha\s*\/\s*modelo|linha)$/i.test(field.name.trim())) {
    type = 'text_short';
  } else if (
    /quantidade de (portas?|gavetas?|p[eé]s?)/i.test(field.name) ||
    /lugar(es)?/i.test(field.name)
  ) {
    type = 'integer';
  } else if (
    /corredi[çc]a/i.test(field.name) ||
    /tipo.*de.*porta/i.test(field.name) ||
    /tipo.*porta/i.test(field.name)
  ) {
    type = 'multi_select';
  } else if (type === 'weight' || isWeightCharacteristicName(field.name)) {
    type = 'decimal';
  }

  if (isYesNoCharacteristic(field)) {
    return (
      <YesNoPowerToggle
        field={field}
        value={value}
        disabled={disabled}
        isInvalid={isInvalid}
        compact={compact}
        onChange={onChange}
      />
    );
  }

  const maxLength = 120;
  if (type === 'text_short' || type === 'text') {
    const isMarca = /^marca$/i.test(field.name.trim());
    const isModelo = /^modelo$/i.test(field.name.trim());
    const isModeloLinha = /^(modelo\s*\/\s*linha|linha\s*\/\s*modelo)$/i.test(field.name.trim());
    const isLinha = /^linha$/i.test(field.name.trim());
    const placeholder = isMarca
      ? 'Digite a marca'
      : isModelo
        ? 'Digite o modelo'
        : isModeloLinha
          ? 'Digite o modelo / linha'
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
  if (type === 'integer' || type === 'number') {
    const isLugares = /lugar(es)?/i.test(field.name);
    const numericDisplayValue = (() => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim()) {
        const match = value.match(/\d+/);
        if (match) return parseInt(match[0], 10);
      }
      return '';
    })();

    return (
      <input
        type="number"
        step="1"
        min="0"
        placeholder={
          isLugares
            ? 'Digite o número de quantidades'
            : /porta/i.test(field.name)
              ? 'Insira a quantidade de portas'
              : /gaveta/i.test(field.name)
                ? 'Insira a quantidade de gavetas'
                : /p[eé]s?/i.test(field.name)
                  ? 'Insira a quantidade de pés'
                  : 'Insira um número inteiro'
        }
        value={numericDisplayValue}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === '') {
            onChange('');
            return;
          }
          const parsed = parseInt(e.target.value, 10);
          if (Number.isNaN(parsed)) {
            onChange('');
            return;
          }
          let val = Math.max(0, parsed);
          if (isLugares) {
            if (val > 100) val = 100;
          } else if (val > 50) {
            val = 50;
          }
          onChange(val);
        }}
        className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
      />
    );
  }
  const isWeight = isWeightCharacteristicName(field.name) || field.dataType === 'weight';
  if (type === 'decimal' || type === 'measure' || isWeight) {
    const decimalPlaces = isWeight ? 1 : type === 'decimal' ? field.decimalPlaces ?? 2 : 2;
    return (
      <DecimalInput
        value={value}
        decimalPlaces={decimalPlaces as 1 | 2 | 3}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }
  if (type === 'percentage') {
    return <PercentageInput value={value} disabled={disabled} onChange={onChange} />;
  }
  const fieldOptions = field.options || [];
  const usesSimpleChoiceDropdown =
    fieldOptions.length > 0 && fieldOptions.length <= SIMPLE_CHOICE_DROPDOWN_LIMIT;

  if (type === 'radio' || type === 'list') {
    if (usesSimpleChoiceDropdown) {
      return <ChoiceDropdown options={fieldOptions} value={value} disabled={disabled} onChange={onChange} />;
    }
    return (
      <ChoiceSearch
        options={fieldOptions}
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
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
    />
  );
}

function formatDecimal(value: any, decimalPlaces: 1 | 2 | 3): string {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
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
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const searchRef = React.useRef<HTMLDivElement>(null);
  const rawArray = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.includes('+')
      ? value.split('+').map((s) => s.trim()).filter(Boolean)
      : [value].filter(Boolean);

  const selected = rawArray
    .map((item) => String(item).trim())
    .filter(
      (item) => item && normalizeSearchTerm(item) !== normalizeSearchTerm('Não se aplica')
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

  const isSearchActive = term.length >= MIN_CHOICE_SEARCH_CHARACTERS && debouncedTerm === term;
  const matchingOptions = useMemo(() => {
    if (isSearchActive) {
      return options.filter((option) => normalizeSearchTerm(option.value).includes(debouncedTerm));
    }
    // When not filtering, if multiple or few options, show all available options
    if (multiple || options.length <= SIMPLE_CHOICE_DROPDOWN_LIMIT) {
      return options;
    }
    return [];
  }, [options, debouncedTerm, isSearchActive, multiple]);

  const filtered = matchingOptions.slice(0, Math.max(MAX_CHOICE_SEARCH_RESULTS, options.length));
  const isSelected =
    term.length === 0
      ? selected.length > 0
      : isSearchActive && selected.some((item) => normalizeSearchTerm(item) === debouncedTerm);

  React.useEffect(() => {
    const closeSuggestions = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', closeSuggestions);
    return () => document.removeEventListener('mousedown', closeSuggestions);
  }, []);

  const inputPlaceholder = multiple
    ? selected.length > 0
      ? 'Adicionar mais opções...'
      : 'Selecione ou pesquise...'
    : 'Digite pelo menos 2 caracteres para pesquisar...';

  const displayInputValue = multiple ? query : query || selected.join(', ');

  return (
    <div ref={searchRef} className="relative space-y-1.5">
      {multiple && selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              <span>{item}</span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remover ${item}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selected.filter((s) => s !== item));
                  }}
                  className="hover:text-red-600 transition-colors cursor-pointer"
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={displayInputValue}
          disabled={disabled}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={inputPlaceholder}
          className={`w-full border-b-2 bg-transparent py-2 pr-8 text-xs outline-none focus:border-blue-600 ${
            isSelected
              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
              : 'border-slate-300'
          }`}
        />
        {isSelected && (
          <i
            className="bi bi-check-lg absolute right-1 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            aria-label="Opção selecionada"
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-1">
          {filtered.length === 0 ? (
            <span className="text-[10px] text-slate-400 p-1">Nenhuma opção encontrada.</span>
          ) : (
            filtered.map((option) =>
              multiple ? (
                <label
                  key={option.id || option.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                >
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
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-200">{option.value}</span>
                </label>
              ) : (
                <button
                  key={option.id || option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
                >
                  {option.value}
                </button>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}
