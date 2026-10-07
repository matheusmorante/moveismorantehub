export const getPriceMagnitude = (priceStr: string): 'tens' | 'hundreds' | 'thousands' => {
  if (!priceStr) return 'hundreds';
  const clean = String(priceStr)
    .replace(/R\$\s*/g, '')
    .trim()
    .replace(/[^0-9,.]/g, '');
  const normalized = clean.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  if (isNaN(num)) return 'hundreds';
  const integerVal = Math.floor(num);
  if (integerVal < 100) return 'tens';
  if (integerVal < 1000) return 'hundreds';
  return 'thousands';
};

export const getIntegerPart = (priceStr: string): string => {
  if (!priceStr) return '0';
  const s = String(priceStr)
    .replace(/R\$\s*/g, '')
    .trim();
  const clean = s.replace(/[^0-9,.]/g, '');
  const normalized = clean.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  if (isNaN(num)) return s.split(',')[0].split('.')[0] || '0';
  return Math.floor(num).toLocaleString('pt-BR');
};

export const fmtBRL = (val: string): string => {
  if (!val) return '0,00';
  if (String(val).includes('R$')) return String(val).replace('R$', '').trim();
  const clean = String(val).replace(/[^0-9,.]/g, '');
  const normalized = clean.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num)
    ? clean
    : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parseLabelPrice = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;

  const digits = String(value).replace(/[^0-9]/g, '');
  if (!digits) return null;

  const price = Number(digits) / 100;
  return Number.isFinite(price) && price > 0 ? price : null;
};

export const getCentsStr = (priceStr: string, tplCentsText: string): string => {
  if (tplCentsText && tplCentsText !== ',00') return tplCentsText;
  if (!priceStr) return ',00';
  const s = String(priceStr).replace(/[^0-9,.]/g, '');
  const parts = s.split(',');
  if (parts.length < 2) return ',00';
  return `,${parts[1].padEnd(2, '0').slice(0, 2)}`;
};
