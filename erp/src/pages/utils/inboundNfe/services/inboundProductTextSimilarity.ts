export interface ExtractedFeatures {
  tokens: string[];
  ngrams: string[];
  doors?: number;
  drawers?: number;
  shelves?: number;
  widthCm?: number;
  colors: string[];
}

const COMMON_COLORS = [
  'branco',
  'preto',
  'off white',
  'offwhite',
  'nature',
  'freijo',
  'cinamomo',
  'marfim',
  'grafite',
  'cinza',
  'amadeirado',
  'nobre',
  'ripado',
  'castanho',
  'imbuia',
  'tauari',
  'carvalho',
  'perola',
  'bege',
  'champagne',
  'chumbo',
  'amendoa',
  'mel',
  'cafe',
  'cerejeira',
  'nogal',
  'macadamia',
  'jacaranda',
];

/**
 * Expansões de atributos quantitativos com regex de palavra-inteira e limite de plausibilidade.
 * Garante que códigos como '3232GV' ou 'ABC3232PTX' NÃO sejam interpretados como atributos.
 * Usa \b (word boundary) para que 'GV' não bata dentro de tokens alfanuméricos compostos.
 * O limite de \d{1,2} restringe o número a no máximo 2 dígitos (1-99),
 * e o campo max impõe plausibilidade de domínio (ex: max 12 portas).
 */
interface AttrExpansion {
  pattern: RegExp;
  canonical: string;
  max: number;
}

const ATTR_EXPANSIONS: AttrExpansion[] = [
  // Portas: PT, PTS, P, PORTA, PORTAS
  { pattern: /\b(\d{1,2})\s*(?:pt(?:s)?|porta(?:s)?|p)\b/g, canonical: 'portas', max: 12 },
  // Gavetas: GV, GVS, GAV, GAVETA, GAVETAS
  { pattern: /\b(\d{1,2})\s*(?:gv(?:s)?|gav(?:eta(?:s)?)?)\b/g, canonical: 'gavetas', max: 8 },
  // Prateleiras: PR, PRAT, PRATELEIRA, PRATELEIRAS
  { pattern: /\b(\d{1,2})\s*(?:pr(?:at(?:eleira(?:s)?)?)?)\b/g, canonical: 'prateleiras', max: 10 },
];

/** Sinônimos de palavras compostas (aplicados antes de tokenizar) */
const COMPOUND_SYNONYMS: Array<{ from: string; to: string }> = [
  { from: 'guarda roupa', to: 'guarda_roupa' },
  { from: 'guarda-roupa', to: 'guarda_roupa' },
  { from: 'criado mudo', to: 'mesa_de_cabeceira' },
  { from: 'mesa de cabeceira', to: 'mesa_de_cabeceira' },
];

/** Sinônimos de palavras simples (aplicados token a token) */
const WORD_SYNONYMS: Record<string, string> = {
  roupeiro: 'guarda_roupa',
  gab: 'balcao',
  gabinete: 'balcao',
  porta: 'portas',
  gaveta: 'gavetas',
  prateleira: 'prateleiras',
};

/**
 * Normaliza o nome de um produto para fins de comparação textual.
 *
 * Pipeline:
 *  1. Remove acentos, converte para minúsculas, substitui pontuação por espaço
 *  2. Expande abreviações de atributos COM verificação de plausibilidade e word-boundary
 *     (ex: 6PT → '6 portas', 2GV → '2 gavetas', 3PR → '3 prateleiras')
 *     Códigos como 3232GV ou ABC3232PTX NÃO são expandidos (limites de \d{1,2} e max)
 *  3. Aplica sinônimos compostos e simples
 *  4. Remove pontuação solta em bordas de tokens
 */
export function normalizeProductName(name: string): string {
  let norm = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9,.]+/g, ' ')
    .trim();

  // 2. Expande atributos com plausibilidade (\d{1,2} = máx 2 dígitos = 1..99, max filtra por domínio)
  for (const { pattern, canonical, max } of ATTR_EXPANSIONS) {
    norm = norm.replace(pattern, (match, num: string) => {
      const v = parseInt(num, 10);
      return v >= 1 && v <= max ? `${num} ${canonical}` : match;
    });
  }

  // 3a. Sinônimos compostos
  for (const { from, to } of COMPOUND_SYNONYMS) {
    norm = norm.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  }

  // 3b. Sinônimos simples (token a token)
  const words = norm.split(/\s+/).map((w) => WORD_SYNONYMS[w] ?? w);
  norm = words.join(' ');

  // 4. Remove pontuação solta em bordas de tokens
  norm = norm
    .split(/\s+/)
    .map((w) => w.replace(/^[.,]+|[.,]+$/g, ''))
    .filter((w) => w.length > 0)
    .join(' ');

  return norm;
}

/**
 * Extrai atributos estruturados de um nome JÁ normalizado por normalizeProductName.
 * Como normalizeProductName já expandiu '6PT' → '6 portas', '2GV' → '2 gavetas' etc.
 * com limites de plausibilidade, aqui apenas detectamos os padrões canônicos.
 * O double-check de plausibilidade (max) evita regressões mesmo se o texto
 * chegar por outro caminho.
 */
export function extractFeatures(normalizedName: string): ExtractedFeatures {
  const tryExtractAttr = (pattern: RegExp, max: number): number | undefined => {
    const m = normalizedName.match(pattern);
    if (!m) return undefined;
    const v = parseInt(m[1], 10);
    return v >= 1 && v <= max ? v : undefined;
  };

  const doors = tryExtractAttr(/\b(\d+)\s+portas\b/, 12);
  const drawers = tryExtractAttr(/\b(\d+)\s+gavetas\b/, 8);
  const shelves = tryExtractAttr(/\b(\d+)\s+prateleiras\b/, 10);

  let widthCm: number | undefined;
  const widthCmMatch = normalizedName.match(/(\d+)\s*cm\b/);
  if (widthCmMatch) {
    widthCm = parseInt(widthCmMatch[1], 10);
  } else {
    const meterMatch = normalizedName.match(/(\d+)[,.]( \d{1,2})\s*m\b/);
    if (meterMatch)
      widthCm = Math.round(parseFloat(`${meterMatch[1]}.${meterMatch[2].trim()}`) * 100);
  }

  const colors = COMMON_COLORS.filter((c) => normalizedName.includes(c));

  // Remove marcadores de atributo dos tokens de comparação — eles já foram extraídos estruturalmente
  const STOP_TOKENS = new Set([
    'portas',
    'gavetas',
    'prateleiras',
    'cm',
    'm',
    'com',
    'de',
    'para',
    'e',
    'the',
    'a',
    'o',
    'as',
    'os',
  ]);
  const filteredTokens = normalizedName
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_TOKENS.has(w));

  // N-Grams (Bigrams) para contextos de identidade como "new xangai"
  const ngrams: string[] = [];
  for (let i = 0; i < filteredTokens.length - 1; i++) {
    ngrams.push(`${filteredTokens[i]} ${filteredTokens[i + 1]}`);
  }

  return { tokens: filteredTokens, ngrams, doors, drawers, shelves, widthCm, colors };
}

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

export function tokenSimilarity(t1: string, t2: string): number {
  if (t1 === t2) return 1;
  // Consider sub-token matching if length difference is small or one is highly contained
  if (t1.includes(t2) || t2.includes(t1)) {
    const lenRatio = Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length);
    if (lenRatio > 0.7) return 0.9;
    if (lenRatio > 0.5) return 0.7;
  }
  const dist = levenshteinDistance(t1, t2);
  const maxLen = Math.max(t1.length, t2.length);
  if (maxLen === 0) return 1;
  const sim = 1 - dist / maxLen;
  // Accept decent similarity
  return sim >= 0.75 ? sim : 0;
}
