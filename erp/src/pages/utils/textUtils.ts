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
