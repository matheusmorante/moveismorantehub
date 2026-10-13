/** NT Conjunta 2025.001, anexos I/II: letras valem ASCII - 48 no módulo 11. */
export const CNPJ_PATTERN = /^[A-Z0-9]{12}[0-9]{2}$/;
export const ACCESS_KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;

/** Remove somente máscara conhecida; caracteres inválidos continuam visíveis à validação. */
export function normalizeFiscalIdentifier(value: unknown): string {
  return String(value ?? '').trim().toUpperCase().replace(/[.\-/\s]/g, '');
}

function mod11(value: string): number {
  let sum = 0;
  for (let index = value.length - 1, weight = 2; index >= 0; index--) {
    sum += (value.charCodeAt(index) - 48) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const digit = 11 - (sum % 11);
  return digit >= 10 ? 0 : digit;
}

export function isValidCnpj(value: unknown): boolean {
  const cnpj = normalizeFiscalIdentifier(value);
  if (!CNPJ_PATTERN.test(cnpj) || cnpj === '00000000000000') return false;
  const first = mod11(cnpj.slice(0, 12));
  const second = mod11(`${cnpj.slice(0, 12)}${first}`);
  return cnpj.slice(12) === `${first}${second}`;
}

export function calculateAccessKeyDigit(base43: string): number {
  if (!/^[0-9]{6}[A-Z0-9]{12}[0-9]{25}$/.test(base43))
    throw new Error('Base da chave de acesso inválida.');
  return mod11(base43);
}

export function hasValidAccessKeyDigit(key: string): boolean {
  return ACCESS_KEY_PATTERN.test(key) && Number(key[43]) === calculateAccessKeyDigit(key.slice(0, 43));
}
