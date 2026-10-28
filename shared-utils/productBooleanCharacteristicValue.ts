/** Keeps unanswered Booleano values distinct from an explicit Não answer. */
export const parseProductBooleanCharacteristicValue = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value !== 'string') return null;

  const normalized = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

  if (['sim', 's', 'true', 'yes', 'ligado'].includes(normalized)) return true;
  if (['nao', 'n', 'false', 'no', 'desligado'].includes(normalized)) return false;
  return null;
};

