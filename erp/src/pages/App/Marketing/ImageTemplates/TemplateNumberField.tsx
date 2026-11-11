import { useEffect, useState } from 'react';

export function NumberField({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => boolean | void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const precision = (String(step).split('.')[1] || '').length;
  const parsed = draft.trim() ? Number(draft) : NaN;
  const debouncedValue = Number.isFinite(parsed)
    ? Number((Math.round(Math.min(max, Math.max(min, parsed)) / step) * step).toFixed(precision)) : null;
  useEffect(() => {
    if (debouncedValue === null || debouncedValue === value) return;
    const timer = window.setTimeout(() => { if (onChange(debouncedValue) === false) setDraft(String(value)); }, 80);
    return () => window.clearTimeout(timer);
  }, [debouncedValue, onChange, value]);
  function commit() {
    const next = debouncedValue ?? value;
    const accepted = value === next || onChange(next) !== false;
    setDraft(String(accepted ? next : value));
  }
  return <label className="ct-field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={draft}
    onChange={(event) => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} /></label>;
}
