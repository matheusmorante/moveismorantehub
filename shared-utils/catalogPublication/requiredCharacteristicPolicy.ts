const normalizeCharacteristicKey = (name: string): string =>
  String(name ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[\s/?¿]+/g, '');

/** These characteristics are excluded from Catalog requirements; ERP may add a category-specific requirement. */
export const isCatalogNeverRequiredCharacteristicName = (name: string): boolean => {
  const key = normalizeCharacteristicKey(name);
  return (
    /^peso(?:\([^)]*\))?$/.test(key) ||
    /^quantidade(?:de|das)porta(?:\(s\)|s)?$/.test(key) ||
    /^tipo(?:\(s\)|s)?(?:de|da|das)porta(?:\(s\)|s)?$/.test(key) ||
    key === 'materialdasportas'
  );
};
