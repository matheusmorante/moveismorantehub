export function normalizeRecipientTaxId(raw: string): string {
  return raw.trim().toUpperCase().replace(/[.\-/\s]/g, '');
}

/**
 * Valida o CPF através do cálculo matemático dos dois dígitos verificadores (módulo 11).
 * Rejeita também sequências com todos os dígitos iguais.
 */
export function isValidCpf(raw: string): boolean {
  const clean = raw.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(clean[i], 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== Number.parseInt(clean[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(clean[i], 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== Number.parseInt(clean[10], 10)) return false;

  return true;
}

/**
 * Valida o CNPJ através do cálculo matemático dos dois dígitos verificadores (módulo 11).
 * Suporta o formato tradicional numérico e o formato alfanumérico oficial da Receita Federal.
 */
export function isValidCnpj(raw: string): boolean {
  const clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.length !== 14) return false;
  if (/^\d{14}$/.test(clean) && /^(\d)\1{13}$/.test(clean)) return false;

  const getVal = (char: string) => char.charCodeAt(0) - 48;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += getVal(clean[i]) * weights1[i];
  }
  const rest1 = sum1 % 11;
  const dv1 = rest1 < 2 ? 0 : 11 - rest1;
  if (Number.parseInt(clean[12], 10) !== dv1) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += (i === 12 ? dv1 : getVal(clean[i])) * weights2[i];
  }
  const rest2 = sum2 % 11;
  const dv2 = rest2 < 2 ? 0 : 11 - rest2;
  if (Number.parseInt(clean[13], 10) !== dv2) return false;

  return true;
}

/** Valida o documento do destinatário incluindo cálculo matemático de dígitos verificadores. */
export function isValidRecipientTaxId(raw: string): boolean {
  const value = normalizeRecipientTaxId(raw);
  if (/^\d{11}$/.test(value)) return isValidCpf(value);
  if (/^[0-9A-Z]{12}\d{2}$/.test(value)) return isValidCnpj(value);
  return false;
}

export function recipientTaxIdKind(raw: string): 'CPF' | 'CNPJ' | null {
  const length = normalizeRecipientTaxId(raw).length;
  return length === 11 ? 'CPF' : length === 14 ? 'CNPJ' : null;
}

export function recipientTaxIdMatchesPersonType(
  raw: string,
  personType?: string
): boolean {
  const kind = recipientTaxIdKind(raw);
  if (!kind || !['PF', 'PJ'].includes(String(personType || ''))) return true;
  return (personType === 'PF' && kind === 'CPF') || (personType === 'PJ' && kind === 'CNPJ');
}

export function getRecipientTaxIdValidationMessage(
  raw: string,
  personType?: string
): string | null {
  const value = normalizeRecipientTaxId(raw);
  if (!value) return null;

  const isCpfFormat = /^\d{11}$/.test(value);
  const isCnpjFormat = /^[0-9A-Z]{12}\d{2}$/.test(value);
  if (!isCpfFormat && !isCnpjFormat) {
    if (personType === 'PF') return 'CPF inválido: informe 11 dígitos numéricos.';
    if (personType === 'PJ') return 'CNPJ inválido: informe 12 caracteres e 2 dígitos verificadores.';
    return 'Documento inválido: informe um CPF com 11 dígitos ou um CNPJ com 14 caracteres.';
  }

  const kind = isCpfFormat ? 'CPF' : 'CNPJ';
  if ((personType === 'PF' && kind === 'CNPJ') || (personType === 'PJ' && kind === 'CPF')) {
    return kind === 'CPF'
      ? 'Tipo de documento incompatível: cliente PJ precisa de um CNPJ.'
      : 'Tipo de documento incompatível: cliente PF precisa de um CPF.';
  }

  if (kind === 'CPF' && !isValidCpf(value)) {
    return 'CPF inválido: os dígitos verificadores calculados não conferem.';
  }

  if (kind === 'CNPJ' && !isValidCnpj(value)) {
    return 'CNPJ inválido: os dígitos verificadores calculados não conferem.';
  }

  return null;
}

export function formatRecipientTaxId(raw: string, personType?: string): string {
  const compact = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const isCnpj = personType === 'PJ' || /[A-Z]/.test(compact) || compact.length > 11;
  const value = isCnpj
    ? compact.slice(0, 14)
    : compact.replace(/\D/g, '').slice(0, 11);
  if (isCnpj) {
    if (value.length > 12)
      return value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5, 8) +
        '/' + value.slice(8, 12) + '-' + value.slice(12);
    if (value.length > 8)
      return value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5, 8) +
        '/' + value.slice(8);
    if (value.length > 5) return value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5);
    if (value.length > 2) return value.slice(0, 2) + '.' + value.slice(2);
    return value;
  }
  if (value.length > 9)
    return value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6, 9) +
      '-' + value.slice(9);
  if (value.length > 6) return value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6);
  if (value.length > 3) return value.slice(0, 3) + '.' + value.slice(3);
  return value;
}
