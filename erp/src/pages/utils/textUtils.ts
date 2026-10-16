import { toTitleCase } from '../../../../shared-utils/productText';

export { toTitleCase };

export function removeAccents(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeSearchTerm(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return removeAccents(str).toLowerCase().trim();
}

/**
 * Constrói padrão Regex para busca insensível a acentuação em banco de dados ou filtros textuais
 */
export function buildAccentInsensitiveRegex(term: string): string {
  if (!term || typeof term !== 'string') return '';
  const map: Record<string, string> = {
    a: '[aàáâãäåAÀÁÂÃÄÅ]',
    e: '[eèéêëEÈÉÊË]',
    i: '[iìíîïyYIÌÍÎÏ]',
    y: '[yYIÌÍÎÏiìíîï]',
    o: '[oòóôõöOÒÓÔÕÖ]',
    u: '[uùúûüUÙÚÛÜ]',
    c: '[cçCÇ]',
  };

  const clean = removeAccents(term).toLowerCase();
  let result = '';
  for (const char of clean) {
    if (char === '-' || char === ' ') {
      result += '[- ]+';
    } else if (map[char]) {
      result += map[char];
    } else if (/[.*+?^${}()|[\]\\]/.test(char)) {
      result += '\\' + char;
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Normaliza número de telefone brasileiro extraindo DDD e os últimos 8 dígitos essenciais
 */
export function normalizeBrPhone(phone?: string | null): { ddd: string; number: string } | null {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) {
    return { ddd: digits.slice(0, 2), number: digits.slice(2) };
  }
  if (digits.length === 11) {
    return { ddd: digits.slice(0, 2), number: digits.slice(-8) };
  }
  return { ddd: digits.length >= 10 ? digits.slice(0, 2) : '', number: digits.slice(-8) };
}

/**
 * Verifica se dois números de telefone pertencem ao mesmo número (ignora formatação, DDI 55 e nono dígito)
 */
export function isSamePhoneNumber(phone1?: string | null, phone2?: string | null): boolean {
  if (!phone1 || !phone2) return false;
  const p1 = normalizeBrPhone(phone1);
  const p2 = normalizeBrPhone(phone2);
  if (!p1 || !p2 || !p1.number || !p2.number) return false;
  if (p1.number !== p2.number) return false;
  if (p1.ddd && p2.ddd && p1.ddd !== p2.ddd) return false;
  return true;
}

