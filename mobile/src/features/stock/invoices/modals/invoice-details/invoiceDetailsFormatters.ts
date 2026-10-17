export const money = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const fiscalDate = (value?: string): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return value.includes('T')
    ? parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : parsed.toLocaleDateString('pt-BR');
};
