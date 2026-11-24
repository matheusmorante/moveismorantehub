export const parseLocalizedNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const raw = String(value)
    .trim()
    .replace(/[^\d.,-]/g, '');
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  let normalized = raw;

  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? ',' : '.';
    normalized = raw
      .replace(decimalSeparator === ',' ? /\./g : /,/g, '')
      .replace(decimalSeparator, '.');
  } else if (comma >= 0) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if ((raw.match(/\./g) || []).length > 1) {
    const lastDot = raw.lastIndexOf('.');
    normalized = `${raw.slice(0, lastDot).replace(/\./g, '')}${raw.slice(lastDot)}`;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
