export const maskAttributeDecimalInput = (input: string, decimalPlaces = 2): string => {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return (Number(digits) / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces);
};

export const formatAttributeDecimalValue = (value: string, decimalPlaces = 2): string => {
  if (!value) return '';
  const numeric = Number(value.replace(',', '.'));
  return Number.isFinite(numeric) ? numeric.toFixed(decimalPlaces).replace('.', ',') : '';
};

export const limitAttributeIntegerInput = (name: string, value: string): string =>
  /quantidade de (portas?|gavetas?)/i.test(name) && Number(value) > 50 ? '50' : value;
