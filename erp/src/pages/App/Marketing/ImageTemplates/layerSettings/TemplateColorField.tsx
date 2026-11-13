import { useEffect, useState, type CSSProperties } from 'react';

export const DEFAULT_COLOR_SWATCHES = ['#ffffff', '#111827', '#2457da', '#e3be02', '#dc2626', '#16a34a', '#f97316', '#7c3aed'] as const;

function normalizeHexColor(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned.split('').map((ch) => ch + ch).join('').toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`;
  }
  return null;
}

export function ColorField({ label, value, swatches = DEFAULT_COLOR_SWATCHES, onChange }: {
  label: string; value: string; swatches?: readonly string[]; onChange: (color: string) => void;
}) {
  const [draft, setDraft] = useState(value.toUpperCase());
  useEffect(() => setDraft(value.toUpperCase()), [value]);
  const uniqueSwatches = Array.from(new Set([value.toLowerCase(), ...swatches.map((color) => color.toLowerCase())])).slice(0, 8);

  function commitHex() {
    const normalized = normalizeHexColor(draft);
    if (normalized) {
      setDraft(normalized.toUpperCase());
      if (normalized !== value.toLowerCase()) onChange(normalized);
    } else {
      setDraft(value.toUpperCase());
    }
  }

  return <div className="ct-field ct-color-field">
    <span>{label}</span>
    <div className="ct-color-control">
      <input type="color" className="ct-color-picker" aria-label={label} value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase())} />
      <input type="text" className="ct-color-hex" aria-label={`Código hexadecimal de ${label.toLowerCase()}`}
        maxLength={7} spellCheck={false} value={draft}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const cleaned = raw.trim().replace(/^#/, '');
          if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
            const next = `#${cleaned.toLowerCase()}`;
            if (next !== value.toLowerCase()) onChange(next);
          }
        }}
        onBlur={commitHex}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
    </div>
    <div className="ct-color-swatches" role="group" aria-label={`Seleção de cores para ${label.toLowerCase()}`}>
      {uniqueSwatches.map((swatch) => <button type="button" key={swatch} className="ct-color-swatch"
        style={{ '--ct-swatch': swatch } as CSSProperties}
        aria-label={`Selecionar cor ${swatch.toUpperCase()} para ${label.toLowerCase()}`}
        aria-pressed={value.toLowerCase() === swatch}
        title={swatch.toUpperCase()}
        onClick={() => onChange(swatch)} />)}
    </div>
  </div>;
}
