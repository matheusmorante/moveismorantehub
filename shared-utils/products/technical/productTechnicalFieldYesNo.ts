/**
 * Canonical ERP/mobile classification for technical fields rendered as Sim/Não.
 */
export type ProductTechnicalFieldYesNoOption = { value?: string | null };

export type ProductTechnicalFieldYesNoInput = {
  name: string;
  dataType?: string | null;
  options?: readonly ProductTechnicalFieldYesNoOption[] | null;
};

const normalizeCharacteristicName = (name: string): string =>
  name.trim().toLocaleLowerCase('pt-BR');

/**
 * Keep the ERP's established criteria in one place so the mobile form chooses
 * the same control for booleans, Sim/Não options, and classic "Possui ..." fields.
 */
export const isProductTechnicalFieldYesNo = (
  field: ProductTechnicalFieldYesNoInput
): boolean => {
  if (field.dataType === 'boolean') return true;

  const options = field.options || [];
  if (options.length >= 1 && options.length <= 3) {
    const normalizedOptions = options.map((option) =>
      normalizeCharacteristicName(option.value || '')
    );
    const hasSim = normalizedOptions.includes('sim');
    const hasNao = normalizedOptions.includes('nao') || normalizedOptions.includes('não');
    const allAreYesNoOrNA = normalizedOptions.every(
      (option) =>
        option === 'sim' ||
        option === 'nao' ||
        option === 'não' ||
        option === 'não se aplica' ||
        option === 'nao se aplica' ||
        option === ''
    );

    if ((hasSim || hasNao) && allAreYesNoOrNA) return true;
  }

  if (/^possui\s+/i.test(field.name.trim()) && options.length <= 2) {
    if (options.length === 0) return true;
    const normalizedOptions = options.map((option) =>
      normalizeCharacteristicName(option.value || '')
    );
    return normalizedOptions.every(
      (option) => option === 'sim' || option === 'nao' || option === 'não' || option === ''
    );
  }

  return false;
};
