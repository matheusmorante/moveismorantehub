const lowercaseWords = new Set([
    'de', 'da', 'do', 'dos', 'das',
    'para', 'pra', 'pro', 'pras', 'pros',
    'com', 'e', 'em', 'a', 'o', 'as', 'os',
    'por', 'sem', 'ou', 'que', 'no', 'na', 'nos', 'nas',
    'pelo', 'pela', 'pelos', 'pelas',
    'ao', 'aos', 'à', 'às',
    'um', 'uma', 'uns', 'umas',
    'sob', 'sobre', 'ate', 'até'
]);

const knownAcronyms = new Set([
    'tv', 'led', 'mdf', 'mdp', 'usb', 'rgb', 'pvc', 'eva', 'hd', '4k', 'bivolt', 'sku', 'un'
]);

function capitalizeWordToken(token: string, isFirstInText: boolean): string {
    if (!token) return '';
    const lower = token.toLowerCase();

    // Tratamento de apóstrofos (ex: d'água, d'Ávila)
    if (lower.startsWith("d'") || lower.startsWith("d’")) {
        const prefix = isFirstInText ? "D'" : "d'";
        const rest = token.slice(2);
        return prefix + (rest ? capitalizeWordToken(rest, false) : '');
    }

    // Preserva acrônimos em maiúsculo (ex: TV, LED, MDF, MDP)
    if (knownAcronyms.has(lower)) {
        return lower.toUpperCase();
    }

    // Mantém preposições/conjunções em minúsculo, exceto no início do texto
    if (!isFirstInText && lowercaseWords.has(lower)) {
        return lower;
    }

    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function processHyphenOrWord(chunk: string, isFirstInText: boolean): string {
    if (!chunk.includes('-')) {
        return capitalizeWordToken(chunk, isFirstInText);
    }
    return chunk
        .split('-')
        .map((sub, idx) => capitalizeWordToken(sub, isFirstInText && idx === 0))
        .join('-');
}

export function toTitleCase(str: any): string {
    if (!str || (typeof str !== 'string' && typeof str !== 'number')) return '';
    const text = String(str).trim();
    if (!text) return '';

    return text
        .split(/\s+/)
        .map((word, index) => {
            if (!word) return '';

            // Se contiver '/', trata cada parte preservando a barra (ex: Branco/Off-White)
            if (word.includes('/')) {
                return word
                    .split('/')
                    .map((slashPart, sIdx) => processHyphenOrWord(slashPart, index === 0 && sIdx === 0))
                    .join('/');
            }

            return processHyphenOrWord(word, index === 0);
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


