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
