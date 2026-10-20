import React, { useState, useEffect, useRef } from 'react';

export function formatDecimal(value: any, decimalPlaces: 1 | 2 | 3): string {
  if (value === '' || value === null || value === undefined) return '';
  const numeric = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(decimalPlaces).replace('.', ',') : '';
}

interface DecimalTechnicalInputProps {
  value: any;
  decimalPlaces: 1 | 2 | 3;
  disabled?: boolean;
  onChange: (value: any) => void;
}

export const DecimalTechnicalInput: React.FC<DecimalTechnicalInputProps> = ({
  value,
  decimalPlaces,
  disabled,
  onChange,
}) => {
  const [draft, setDraft] = useState(() => formatDecimal(value, decimalPlaces));
  const lastEmittedValue = useRef<number | null>(null);

  useEffect(() => {
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
};
