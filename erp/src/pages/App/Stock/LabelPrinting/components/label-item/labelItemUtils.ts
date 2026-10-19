export const formatPrice = (price?: string | number): string => {
  if (!price) return '';
  const p = String(price);
  if (p.includes('R$')) return p;
  const clean = p.replace(/\D/g, '');
  const val = parseInt(clean, 10) / 100;
  return isNaN(val) ? '' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatLabelPrice = (priceStr: string, isEffectivelySplit: boolean): string => {
  if (!priceStr) return '';
  const unified = formatPrice(priceStr);
  if (!isEffectivelySplit) return unified;
  return unified.replace('R$', '').replace(',00', '').trim();
};

export const getAlignment = (align?: string): 'center' | 'flex-end' | 'flex-start' =>
  align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

export const getVAlignment = (valign?: string): 'center' | 'flex-end' | 'flex-start' =>
  valign === 'middle' ? 'center' : valign === 'bottom' ? 'flex-end' : 'flex-start';
