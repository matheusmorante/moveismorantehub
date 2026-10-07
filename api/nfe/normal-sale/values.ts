export const obj = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Fatos fiscais obrigatórios ausentes.');
  return value as Record<string, any>;
};
export const required = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} ausente.`);
  return value.trim();
};
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

export const money = (value: unknown, field: string, positive = false): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < (positive ? 0.01 : 0) ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  )
    throw new Error(`${field} inválido ou fora da precisão de centavos.`);
  return Math.round(value * 100);
};
