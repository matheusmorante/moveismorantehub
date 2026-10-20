import React, { useState, useEffect } from 'react';

interface PercentageTechnicalInputProps {
  value: any;
  disabled?: boolean;
  onChange: (value: any) => void;
}

export const PercentageTechnicalInput: React.FC<PercentageTechnicalInputProps> = ({
  value,
  disabled,
  onChange,
}) => {
  const [draft, setDraft] = useState(() => String(value ?? '').replace('.', ','));

  useEffect(() => {
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
};
