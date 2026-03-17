/**
 * Utilitário de pluralização para português brasileiro.
 * Converte nomes de tipos de móveis do singular para o plural.
 * Ex: "Mesa de Cabeceira" -> "Mesas de Cabeceira"
 *     "Sofá" -> "Sofás"
 *     "Estante" -> "Estantes"
 */

// Mapa de irregulares e exceções conhecidas
const IRREGULARES: Record<string, string> = {
    'sofá': 'sofás',
    'sofas': 'sofás',
    'painel de tv': 'painéis de tv',
    'painel': 'painéis',
    'canapé': 'canapés',
    'chapéu': 'chapéus',
};

// Pluralização da PRIMEIRA palavra da frase (o substantivo principal)
function pluralizePrimeiraWord(word: string): string {
    const lower = word.toLowerCase();

    // Verificar irregulares diretos
    if (IRREGULARES[lower]) return capitalizarFirstLetter(IRREGULARES[lower]);

    // Palavras terminadas em ão -> ões (ex: balcão -> balcões)
    if (lower.endsWith('ão')) return capitalizarFirstLetter(lower.slice(0, -2) + 'ões');
    // Palavras terminadas em al -> ais (ex: puff vertical -> irrelevante mas painel -> painéis está em irregulares)
    if (lower.endsWith('al')) return capitalizarFirstLetter(lower.slice(0, -2) + 'ais');
    // Palavras terminadas em el -> éis (ex: painel tratado acima)
    if (lower.endsWith('el')) return capitalizarFirstLetter(lower.slice(0, -2) + 'éis');
    // Palavras terminadas em ol -> óis
    if (lower.endsWith('ol')) return capitalizarFirstLetter(lower.slice(0, -2) + 'óis');
    // Palavras terminadas em ul -> uis
    if (lower.endsWith('ul')) return capitalizarFirstLetter(lower.slice(0, -2) + 'uis');
    // Palavras terminadas em ã -> ãs
    if (lower.endsWith('ã')) return capitalizarFirstLetter(lower + 's');
    // Palavras terminadas em ém -> ens (ex: também, vem)
    if (lower.endsWith('ém')) return capitalizarFirstLetter(lower.slice(0, -2) + 'ens');
    // Palavras terminadas em r, s, z -> es
    if (/[rsz]$/.test(lower)) return capitalizarFirstLetter(lower + 'es');
    // Palavras terminadas em m -> ns (ex: rim -> rins — pouco comum em móveis)
    if (lower.endsWith('m')) return capitalizarFirstLetter(lower.slice(0, -1) + 'ns');
    // Palavras terminadas em vogal ou outras consoantes -> s
    return capitalizarFirstLetter(lower + 's');
}

function capitalizarFirstLetter(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Pluraliza o nome de um tipo de produto para uso como nome de coleção.
 * Apenas a primeira palavra (o substantivo) é pluralizada;
 * o restante da frase (ex: "de Cabeceira", "com Espelho") permanece intacto.
 * 
 * @example
 * pluralizeProductType("Mesa de Cabeceira") // => "Mesas de Cabeceira"
 * pluralizeProductType("Sofá de Canto")     // => "Sofás de Canto"
 * pluralizeProductType("CAMA")              // => "Camas"
 */
export function pluralizeProductType(typeName: string): string {
    if (!typeName) return typeName;

    const trimmed = typeName.trim();
    const lower = trimmed.toLowerCase();

    // Verificar se o nome inteiro está nos irregulares
    if (IRREGULARES[lower]) return capitalizarFirstLetter(IRREGULARES[lower]);

    // Separar a primeira palavra do restante
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) {
        // Uma única palavra: pluralizar direto
        return pluralizePrimeiraWord(trimmed);
    }

    const primeiraWord = trimmed.slice(0, spaceIdx);
    const resto = trimmed.slice(spaceIdx); // inclui o espaço

    return pluralizePrimeiraWord(primeiraWord) + resto;
}
