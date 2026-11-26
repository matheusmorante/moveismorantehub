/** Keeps option labels compatible with the ERP's comma-delimited input format. */
export const normalizeProductAttributeOptionValue = (value: string): string =>
  value.trim().replace(/,/g, '');
