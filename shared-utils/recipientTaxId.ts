export function normalizeRecipientTaxId(raw: string): string {
  return raw.trim().toUpperCase().replace(/[.\-/\s]/g, '');
}

/**
 * Calcula matematicamente os dois dígitos verificadores de um CPF (módulo 11 oficial).
 */
export function calculateCpfCheckDigits(clean9: string): { dv1: number; dv2: number } {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(clean9[i], 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  const dv1 = rest === 10 || rest === 11 ? 0 : rest;

  sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(clean9[i], 10) * (11 - i);
  }
  sum += dv1 * 2;
  rest = (sum * 10) % 11;
  const dv2 = rest === 10 || rest === 11 ? 0 : rest;

  return { dv1, dv2 };
}

/**
 * Calcula matematicamente os dois dígitos verificadores de um CNPJ (módulo 11 oficial).
 * Suporta o formato numérico e alfanumérico da Receita Federal.
 */
export function calculateCnpjCheckDigits(clean12: string): { dv1: number; dv2: number } {
  const getVal = (char: string) => char.charCodeAt(0) - 48;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += getVal(clean12[i]) * weights1[i];
  }
  const rest1 = sum1 % 11;
  const dv1 = rest1 < 2 ? 0 : 11 - rest1;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 12; i++) {
    sum2 += getVal(clean12[i]) * weights2[i];
  }
  sum2 += dv1 * weights2[12];
  const rest2 = sum2 % 11;
  const dv2 = rest2 < 2 ? 0 : 11 - rest2;

  return { dv1, dv2 };
}

/**
 * Valida o CPF através do cálculo matemático dos dois dígitos verificadores (módulo 11).
 * Rejeita também sequências com todos os dígitos iguais.
 */
export function isValidCpf(raw: string): boolean {
  const clean = raw.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  const { dv1, dv2 } = calculateCpfCheckDigits(clean.slice(0, 9));
  return (
    Number.parseInt(clean[9], 10) === dv1 &&
    Number.parseInt(clean[10], 10) === dv2
  );
}

/**
 * Valida o CNPJ através do cálculo matemático dos dois dígitos verificadores (módulo 11).
 * Suporta o formato tradicional numérico e o formato alfanumérico oficial da Receita Federal.
 */
export function isValidCnpj(raw: string): boolean {
  const clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.length !== 14) return false;
  if (/^\d{14}$/.test(clean) && /^(\d)\1{13}$/.test(clean)) return false;

  const { dv1, dv2 } = calculateCnpjCheckDigits(clean.slice(0, 12));
  return (
    Number.parseInt(clean[12], 10) === dv1 &&
    Number.parseInt(clean[13], 10) === dv2
  );
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
  const clean = normalizeRecipientTaxId(raw);
  if (!clean) return null;

  const rawTrimmed = raw.trim();
  const hasLetters = /[A-Z]/.test(clean);

  // 1. Validação quando o cadastro do cliente é Pessoa Física (PF)
  if (personType === 'PF') {
    if (hasLetters) {
      return `CPF inválido: contém letras ou caracteres alfanuméricos ("${rawTrimmed}"). Para Pessoa Física, informe apenas os 11 números do CPF.`;
    }
    if (clean.length < 11) {
      const missing = 11 - clean.length;
      return `CPF incompleto: foram informados apenas ${clean.length} dos 11 dígitos necessários (faltam ${missing} dígito${missing > 1 ? 's' : ''}).`;
    }
    if (clean.length > 11) {
      if (clean.length === 14) {
        return 'Tipo de documento divergente: o cliente é Pessoa Física (PF), mas foi informado um CNPJ de 14 dígitos. Digite um CPF válido.';
      }
      return `CPF com excesso de dígitos: foram informados ${clean.length} dígitos, excedendo os 11 dígitos permitidos para o CPF.`;
    }
    // Exatamente 11 dígitos numéricos
    if (/^(\d)\1{10}$/.test(clean)) {
      return `CPF inválido: todos os 11 dígitos são repetidos (${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}). Sequências repetidas são rejeitadas pela Receita Federal.`;
    }
    const { dv1, dv2 } = calculateCpfCheckDigits(clean.slice(0, 9));
    const dv1Inf = Number.parseInt(clean[9], 10);
    const dv2Inf = Number.parseInt(clean[10], 10);
    if (dv1Inf !== dv1 && dv2Inf !== dv2) {
      return `CPF inválido: os 2 dígitos verificadores informados (${dv1Inf}${dv2Inf}) não conferem com o cálculo oficial da Receita Federal (deveriam ser ${dv1}${dv2}).`;
    }
    if (dv1Inf !== dv1) {
      return `CPF inválido: o 1º dígito verificador informado (${dv1Inf}) não confere com o cálculo oficial da Receita Federal (deveria ser ${dv1}).`;
    }
    if (dv2Inf !== dv2) {
      return `CPF inválido: o 2º dígito verificador informado (${dv2Inf}) não confere com o cálculo oficial da Receita Federal (deveria ser ${dv2}).`;
    }
    return null;
  }

  // 2. Validação quando o cadastro do cliente é Pessoa Jurídica (PJ)
  if (personType === 'PJ') {
    if (clean.length === 11 && !hasLetters) {
      return 'Tipo de documento divergente: a empresa é Pessoa Jurídica (PJ), mas foi informado um CPF de 11 dígitos. Digite um CNPJ válido.';
    }
    if (clean.length < 14) {
      const missing = 14 - clean.length;
      return `CNPJ incompleto: foram informados apenas ${clean.length} dos 14 caracteres necessários (faltam ${missing} caractere${missing > 1 ? 's' : ''}).`;
    }
    if (clean.length > 14) {
      return `CNPJ com excesso de caracteres: foram informados ${clean.length} caracteres, excedendo os 14 caracteres permitidos para o CNPJ.`;
    }
    // Exatamente 14 caracteres
    if (/^\d{14}$/.test(clean) && /^(\d)\1{13}$/.test(clean)) {
      return 'CNPJ inválido: todos os 14 dígitos são repetidos. Sequências repetidas são rejeitadas pela Receita Federal.';
    }
    const { dv1, dv2 } = calculateCnpjCheckDigits(clean.slice(0, 12));
    const dv1Inf = Number.parseInt(clean[12], 10);
    const dv2Inf = Number.parseInt(clean[13], 10);
    if (Number.isNaN(dv1Inf) || Number.isNaN(dv2Inf)) {
      return 'CNPJ inválido: os 2 últimos caracteres devem ser dígitos verificadores numéricos.';
    }
    if (dv1Inf !== dv1 && dv2Inf !== dv2) {
      return `CNPJ inválido: os 2 dígitos verificadores informados (${dv1Inf}${dv2Inf}) não conferem com o cálculo oficial (deveriam ser ${dv1}${dv2}).`;
    }
    if (dv1Inf !== dv1) {
      return `CNPJ inválido: o 1º dígito verificador informado (${dv1Inf}) não confere com o cálculo oficial (deveria ser ${dv1}).`;
    }
    if (dv2Inf !== dv2) {
      return `CNPJ inválido: o 2º dígito verificador informado (${dv2Inf}) não confere com o cálculo oficial (deveria ser ${dv2}).`;
    }
    return null;
  }

  // 3. Validação quando o tipo de pessoa não está explícito no cadastro (PF/PJ não determinado)
  if (clean.length < 11) {
    const missingCpf = 11 - clean.length;
    return `Documento incompleto: foram informados ${clean.length} dígitos (faltam ${missingCpf} dígito${missingCpf > 1 ? 's' : ''} para CPF ou ${14 - clean.length} caracteres para CNPJ).`;
  }
  if (clean.length === 11) {
    if (hasLetters) {
      return 'CPF inválido: contém letras. Para CPF são permitidos apenas 11 números.';
    }
    if (/^(\d)\1{10}$/.test(clean)) {
      return `CPF inválido: todos os 11 dígitos são repetidos (${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}). Sequências repetidas são rejeitadas pela Receita Federal.`;
    }
    const { dv1, dv2 } = calculateCpfCheckDigits(clean.slice(0, 9));
    const dv1Inf = Number.parseInt(clean[9], 10);
    const dv2Inf = Number.parseInt(clean[10], 10);
    if (dv1Inf !== dv1 && dv2Inf !== dv2) {
      return `CPF inválido: os 2 dígitos verificadores informados (${dv1Inf}${dv2Inf}) não conferem com o cálculo oficial da Receita Federal (deveriam ser ${dv1}${dv2}).`;
    }
    if (dv1Inf !== dv1) {
      return `CPF inválido: o 1º dígito verificador informado (${dv1Inf}) não confere com o cálculo oficial da Receita Federal (deveria ser ${dv1}).`;
    }
    if (dv2Inf !== dv2) {
      return `CPF inválido: o 2º dígito verificador informado (${dv2Inf}) não confere com o cálculo oficial da Receita Federal (deveria ser ${dv2}).`;
    }
    return null;
  }
  if (clean.length > 11 && clean.length < 14) {
    const missingCnpj = 14 - clean.length;
    return `CNPJ incompleto: foram informados ${clean.length} caracteres de 14 necessários para um CNPJ (faltam ${missingCnpj} caractere${missingCnpj > 1 ? 's' : ''}).`;
  }
  if (clean.length === 14) {
    if (/^\d{14}$/.test(clean) && /^(\d)\1{13}$/.test(clean)) {
      return 'CNPJ inválido: todos os 14 dígitos são repetidos. Sequências repetidas são rejeitadas pela Receita Federal.';
    }
    const { dv1, dv2 } = calculateCnpjCheckDigits(clean.slice(0, 12));
    const dv1Inf = Number.parseInt(clean[12], 10);
    const dv2Inf = Number.parseInt(clean[13], 10);
    if (Number.isNaN(dv1Inf) || Number.isNaN(dv2Inf)) {
      return 'CNPJ inválido: os 2 últimos caracteres devem ser dígitos verificadores numéricos.';
    }
    if (dv1Inf !== dv1 && dv2Inf !== dv2) {
      return `CNPJ inválido: os 2 dígitos verificadores informados (${dv1Inf}${dv2Inf}) não conferem com o cálculo oficial (deveriam ser ${dv1}${dv2}).`;
    }
    if (dv1Inf !== dv1) {
      return `CNPJ inválido: o 1º dígito verificador informado (${dv1Inf}) não confere com o cálculo oficial (deveria ser ${dv1}).`;
    }
    if (dv2Inf !== dv2) {
      return `CNPJ inválido: o 2º dígito verificador informado (${dv2Inf}) não confere com o cálculo oficial (deveria ser ${dv2}).`;
    }
    return null;
  }
  return `Documento com tamanho inválido: foram informados ${clean.length} caracteres (o documento deve ter 11 dígitos para CPF ou 14 para CNPJ).`;
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
