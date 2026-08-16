const lowercaseWords = new Set(['de', 'da', 'do', 'dos', 'das', 'para', 'com', 'e', 'em', 'a', 'o', 'as', 'os', 'por', 'sem', 'ou']);

export function toTitleCase(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .map((word, index) => {
            if (!word) return '';
            if (index === 0 || !lowercaseWords.has(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        })
        .join(' ');
}
