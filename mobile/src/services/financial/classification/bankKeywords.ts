export const BANK_FINANCIAL_INSTITUTION_KEYWORDS = [
  'banco',
  'itaú',
  'itau',
  'bradesco',
  'santander',
  'nubank',
  'caixa',
  'inter',
  'sicoob',
  'sicredi',
  'safra',
  'btg',
  'c6',
  'financeira',
  'cooperativa',
];

export function isBankFinancialInstitution(text: string): boolean {
  const lower = text.toLowerCase();
  return BANK_FINANCIAL_INSTITUTION_KEYWORDS.some((keyword) => lower.includes(keyword));
}
