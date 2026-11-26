/**
 * Utilitários de normalização e formatação de telefones para a Central de Atendimento WhatsApp.
 * Suporta padrão internacional E.164, regras brasileiras de DDI +55, DDDs e variação do 9º dígito.
 */

export interface ParsedBrazilianPhone {
  isBrazilian: boolean;
  countryCode: string; // ex: '55'
  ddd: string | null; // ex: '11'
  number: string; // ex: '987654321' ou '87654321'
  hasNinthDigit: boolean;
  e164: string; // ex: '+5511987654321'
}

/**
 * Remove qualquer caractere não numérico da string
 */
export function extractDigits(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Normaliza um telefone para o formato padrão E.164 (+5511987654321)
 */
export function normalizeToE164(phone: string | null | undefined): string {
  const digits = extractDigits(phone);
  if (!digits) return '';

  // Se já começar com 55 e tiver 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  // Se for número brasileiro com DDD (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  // Outros números internacionais já com DDI
  if (digits.length >= 11 && !digits.startsWith('55')) {
    return `+${digits}`;
  }

  // Fallback seguro
  return digits ? `+${digits}` : '';
}

/**
 * Analisa a estrutura do telefone brasileiro
 */
export function parseBrazilianPhone(phone: string | null | undefined): ParsedBrazilianPhone {
  let digits = extractDigits(phone);
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  const isWith55 = digits.startsWith('55') && (digits.length === 12 || digits.length === 13);
  const localDigits = isWith55 ? digits.slice(2) : digits;

  if (localDigits.length === 10 || localDigits.length === 11) {
    const ddd = localDigits.slice(0, 2);
    const number = localDigits.slice(2);
    const hasNinthDigit = localDigits.length === 11 && number.startsWith('9');
    const e164 = `+55${localDigits}`;

    return {
      isBrazilian: true,
      countryCode: '55',
      ddd,
      number,
      hasNinthDigit,
      e164,
    };
  }

  return {
    isBrazilian: isWith55,
    countryCode: isWith55 ? '55' : '',
    ddd: null,
    number: digits,
    hasNinthDigit: false,
    e164: digits ? `+${digits}` : '',
  };
}

/**
 * Gera variações possíveis de um número de telefone para busca e correspondência
 * no banco de dados (ex: com 9º dígito, sem 9º dígito, com/sem DDI 55 e formatações usuais).
 */
export function getPhoneLookupCandidates(phone: string | null | undefined): string[] {
  const digits = extractDigits(phone);
  if (!digits || digits.length < 8) return [];

  const candidates = new Set<string>();
  candidates.add(digits);

  const parsed = parseBrazilianPhone(phone);
  if (parsed.isBrazilian && parsed.ddd) {
    const ddd = parsed.ddd;
    const num = parsed.number;

    // Variação com 9 dígitos
    let numWith9 = num;
    let numWithout9 = num;

    if (num.length === 8) {
      numWith9 = `9${num}`;
    } else if (num.length === 9 && num.startsWith('9')) {
      numWithout9 = num.slice(1);
    }

    // Com 9 dígitos
    const full11 = `${ddd}${numWith9}`;
    candidates.add(full11);
    candidates.add(`55${full11}`);
    candidates.add(`+55${full11}`);
    candidates.add(`(${ddd}) ${numWith9.slice(0, 5)}-${numWith9.slice(5)}`);
    candidates.add(`(${ddd}) ${numWith9}`);

    // Sem 9 dígitos
    const full10 = `${ddd}${numWithout9}`;
    candidates.add(full10);
    candidates.add(`55${full10}`);
    candidates.add(`+55${full10}`);
    candidates.add(`(${ddd}) ${numWithout9.slice(0, 4)}-${numWithout9.slice(4)}`);
    candidates.add(`(${ddd}) ${numWithout9}`);
  }

  return Array.from(candidates);
}

/**
 * Formata um número para apresentação amigável na interface
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '-';
  const digits = extractDigits(phone);
  const parsed = parseBrazilianPhone(phone);

  if (parsed.isBrazilian && parsed.ddd) {
    const num = parsed.number;
    if (num.length === 9) {
      return `(${parsed.ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    }
    if (num.length === 8) {
      return `(${parsed.ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
    }
    return `(${parsed.ddd}) ${num}`;
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}
