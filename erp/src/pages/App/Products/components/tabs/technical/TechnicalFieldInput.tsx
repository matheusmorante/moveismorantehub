import React, { useMemo, useState } from 'react';
import { TechnicalCombobox } from './TechnicalCombobox';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

const MAX_INLINE_CHOICE_OPTIONS = 8;

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
  let type = field.dataType || 'list';
  const isShortTextCharacteristic = /^(linha|marca|modelo)$/i.test(field.name.trim());
  if (isShortTextCharacteristic) {
    type = 'text_short';
  } else if (
    /quantidade de (portas?|gavetas?)/i.test(field.name) ||
    /lugar(es)?/i.test(field.name)
  ) {
    type = 'integer';
  }
  const maxLength = isShortTextCharacteristic ? 30 : 120;
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
  if (type === 'integer' || type === 'number') {
    const isLugares = /lugar(es)?/i.test(field.name);
    return (
      <input
        type="number"
        step="1"
        min="0"
        placeholder={
          isLugares
            ? 'Digite o número de quantidades'
            : /porta|gaveta/i.test(field.name)
              ? 'Insira a quantidade de portas'
              : 'Insira um número inteiro'
        }
        value={value ?? ''}
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
  if (type === 'decimal' || type === 'measure')
    return <DecimalInput value={value} disabled={disabled} onChange={onChange} />;
  const isSmallList =
    field.options.length > 0 && field.options.length <= MAX_INLINE_CHOICE_OPTIONS;

  if (type === 'radio') {
    if (isSmallList) {
      return (
        <SmallListChips options={field.options} value={value} disabled={disabled} onChange={onChange} />
      );
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
  if ((type === 'list' || !type) && isSmallList) {
    return (
      <SmallListChips options={field.options} value={value} disabled={disabled} onChange={onChange} />
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
  disabled,
  onChange,
}: {
  value: any;
  disabled?: boolean;
  onChange: (value: any) => void;
}) {
  const [draft, setDraft] = useState(() => formatDecimal(value));

  React.useEffect(() => {
    setDraft(formatDecimal(value));
  }, [value]);

  const handleMaskedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (!digits) {
      setDraft('');
      onChange('');
      return;
    }
    const numeric = Number(digits) / 100;
    setDraft(formatDecimal(numeric));
    onChange(numeric);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder="0,00"
      value={draft}
      disabled={disabled}
      onChange={handleMaskedChange}
      className="w-full border-b-2 border-slate-300 bg-transparent py-2 text-xs outline-none focus:border-blue-600"
    />
  );
}

function formatDecimal(value: any): string {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2).replace('.', ',') : '';
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
  const searchRef = React.useRef<HTMLDivElement>(null);
  const selected = (Array.isArray(value) ? value : [value].filter(Boolean)).filter(
    (item) => normalizeSearchTerm(String(item)) !== normalizeSearchTerm('Não se aplica')
  );
  const term = normalizeSearchTerm(query);
  const displayValue = query || selected.join(', ');
  const filtered = useMemo(
    () =>
      term.length < 2 ? [] : options.filter((o) => normalizeSearchTerm(o.value).includes(term)),
    [options, term]
  );
  const exactMatch =
    term.length >= 2 ? options.find((o) => normalizeSearchTerm(o.value) === term) : undefined;
  const isSelected =
    term.length === 0
      ? selected.length > 0
      : Boolean(exactMatch && selected.some((item) => normalizeSearchTerm(item) === term));

  React.useEffect(() => {
    if (!exactMatch || isSelected || disabled) return;
    onChange(multiple ? [...selected, exactMatch.value] : exactMatch.value);
  }, [exactMatch, isSelected, disabled, multiple, onChange, selected]);

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
      {term.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {filtered.map((o) =>
            multiple ? (
              <label key={o.id || o.value} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.includes(o.value)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, o.value]
                        : selected.filter((v) => v !== o.value)
                    )
                  }
                />
                <span>{o.value}</span>
              </label>
            ) : (
              <button
                key={o.id || o.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(o.value)}
                className="w-full rounded px-1 py-0.5 text-left text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
              >
                {o.value}
              </button>
            )
          )}
          {filtered.length === 0 && (
            <span className="text-[10px] text-slate-400">Nenhuma opção encontrada.</span>
          )}
        </div>
      )}
    </div>
  );
}


function SmallListChips({
  options,
  value,
  disabled,
  onChange,
}: {
  options: readonly { id?: string; value: string }[];
  value: any;
  disabled?: boolean;
  onChange: (v: any) => void;
}) {
  const selectedStr = String(value || '').trim();
  
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(o => {
        const isSelected = String(o.value).trim() === selectedStr;
        return (
          <button
            key={o.id || o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(isSelected ? '' : o.value)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
              isSelected 
                ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {o.value}
          </button>
        );
      })}
    </div>
  );
}
