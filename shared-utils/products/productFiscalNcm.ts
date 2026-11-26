type ProductFiscalNcmFields = {
  ncm?: unknown;
  ncmDescription?: unknown;
};

const normalizeNcmCode = (value: unknown) =>
  String(value ?? '').replace(/\D/g, '').slice(0, 8);

/** Keeps fiscal NCM form state aligned when the operator changes the code. */
export function updateProductFiscalNcmCode<T extends object>(
  fiscal: T | null | undefined,
  ncm: string
): T & ProductFiscalNcmFields {
  const current = { ...(fiscal || {}) } as T & ProductFiscalNcmFields;
  const currentCode = normalizeNcmCode(current.ncm);
  const nextCode = normalizeNcmCode(ncm);

  return {
    ...current,
    ncm,
    ...(currentCode !== nextCode ? { ncmDescription: '' } : {}),
  };
}

/** Fills a missing official description only while the form still holds that NCM. */
export function fillMissingProductFiscalNcmDescription<T extends object>(
  fiscal: T | null | undefined,
  code: string,
  officialDescription: string
): T & ProductFiscalNcmFields {
  const current = (fiscal || {}) as T & ProductFiscalNcmFields;
  if (normalizeNcmCode(current.ncm) !== code || current.ncmDescription) return current;

  return { ...current, ncmDescription: officialDescription };
}
