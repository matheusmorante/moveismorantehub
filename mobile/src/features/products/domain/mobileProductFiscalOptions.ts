export const MOBILE_SERVICE_CFOP_OPTIONS = [
  { value: '5933', label: '5933 - Prestação de serviço dentro do Estado' },
  { value: '6933', label: '6933 - Prestação de serviço para fora do Estado' },
] as const;

/**
 * Mirrors the ERP's 5933 default when the service has no CFOP, while keeping a
 * legacy value visible instead of presenting 5933 as if it were already saved.
 */
export function resolveMobileServiceCfopLabel(cfop?: string | null): string {
  const value = cfop || MOBILE_SERVICE_CFOP_OPTIONS[0].value;
  const selectedOption = MOBILE_SERVICE_CFOP_OPTIONS.find((option) => option.value === value);

  if (selectedOption) return selectedOption.label;
  return `CFOP salvo: ${value} (fora das opções municipais atuais)`;
}
