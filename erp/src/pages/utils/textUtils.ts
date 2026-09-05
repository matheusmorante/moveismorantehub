const lowercaseWords = new Set([
    'de', 'da', 'do', 'dos', 'das',
    'para', 'com', 'e', 'em', 'a', 'o', 'as', 'os',
    'por', 'sem', 'ou', 'que', 'no', 'na', 'nos', 'nas',
    'pelo', 'pela', 'pelos', 'pelas'
]);

export function toTitleCase(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str
        .trim()
        .split(/\s+/)
        .map((word, index) => {
            if (!word) return '';

            if (word.includes('/')) {
                return word.split('/').map((subWord, subIdx) => {
                    const lower = subWord.toLowerCase();
                    if ((index > 0 || subIdx > 0) && lowercaseWords.has(lower)) {
                        return lower;
                    }
                    return lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : '';
                }).join('/');
            }

            const lower = word.toLowerCase();
            if (index === 0 || !lowercaseWords.has(lower)) {
                return lower.charAt(0).toUpperCase() + lower.slice(1);
            }
            return lower;
        })
        .join(' ');
}

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
        'a': '[aàáâãäåAÀÁÂÃÄÅ]',
        'e': '[eèéêëEÈÉÊË]',
        'i': '[iìíîïIÌÍÎÏ]',
        'o': '[oòóôõöOÒÓÔÕÖ]',
        'u': '[uùúûüUÙÚÛÜ]',
        'c': '[cçCÇ]',
    };

    const clean = removeAccents(term).toLowerCase();
    let result = '';
    for (const char of clean) {
        if (map[char]) {
            result += map[char];
        } else if (/[.*+?^${}()|[\]\\]/.test(char)) {
            result += '\\' + char;
        } else {
            result += char;
        }
    }
    return result;
}


