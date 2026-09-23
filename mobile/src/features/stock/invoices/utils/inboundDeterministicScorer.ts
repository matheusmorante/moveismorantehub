export type InboundScorerProduct = {
  id: string;
  productId: string;
  variationId?: string;
  name: string;
  comparisonName?: string;
  sku?: string | null;
  sellingPrice?: number;
};

type Features = {
  tokens: string[];
  ngrams: string[];
  doors?: number;
  drawers?: number;
  shelves?: number;
  widthCm?: number;
  colors: string[];
};

const COLORS = [
  'branco', 'preto', 'off white', 'offwhite', 'nature', 'freijo', 'cinamomo', 'marfim', 'grafite',
  'cinza', 'amadeirado', 'nobre', 'ripado', 'castanho', 'imbuia', 'tauari', 'carvalho', 'perola',
  'bege', 'champagne', 'chumbo', 'amendoa', 'mel', 'cafe', 'cerejeira', 'nogal', 'macadamia', 'jacaranda',
];

const GENERIC = new Set([
  'guarda_roupa', 'roupeiro', 'balcao', 'mesa', 'cadeira', 'cabeceira', 'armario', 'estante', 'painel',
  'rack', 'cama', 'colchao', 'sofa', 'poltrona', 'cozinha', 'quarto', 'sala', 'mdf', 'mdp', 'madeira',
  'aco', 'vidro', 'espelho', 'branco', 'preto', 'cinza', 'off', 'white', 'doripel', 'madesa',
  'kappesberg', 'itatiaia', 'g', 'roupa',
]);

export function normalizeInboundProductName(value: string) {
  let normalized = (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9,.]+/g, ' ').trim();
  const expansions: Array<[RegExp, string, number]> = [
    [/\b(\d{1,2})\s*(?:pt(?:s)?|porta(?:s)?|p)\b/g, 'portas', 12],
    [/\b(\d{1,2})\s*(?:gv(?:s)?|gav(?:eta(?:s)?)?)\b/g, 'gavetas', 8],
    [/\b(\d{1,2})\s*(?:pr(?:at(?:eleira(?:s)?)?)?)\b/g, 'prateleiras', 10],
  ];
  for (const [pattern, canonical, max] of expansions) {
    normalized = normalized.replace(pattern, (match, number: string) => {
      const count = Number.parseInt(number, 10);
      return count >= 1 && count <= max ? `${number} ${canonical}` : match;
    });
  }
  for (const [from, to] of [['guarda roupa', 'guarda_roupa'], ['guarda-roupa', 'guarda_roupa'], ['criado mudo', 'mesa_de_cabeceira'], ['mesa de cabeceira', 'mesa_de_cabeceira']]) {
    normalized = normalized.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  }
  const synonyms: Record<string, string> = { roupeiro: 'guarda_roupa', gab: 'balcao', gabinete: 'balcao', porta: 'portas', gaveta: 'gavetas', prateleira: 'prateleiras' };
  return normalized.split(/\s+/).map((word) => (synonyms[word] || word).replace(/^[.,]+|[.,]+$/g, '')).filter(Boolean).join(' ');
}

function extractFeatures(normalizedName: string): Features {
  const attribute = (pattern: RegExp, max: number) => {
    const match = normalizedName.match(pattern);
    if (!match) return undefined;
    const value = Number.parseInt(match[1], 10);
    return value >= 1 && value <= max ? value : undefined;
  };
  const cm = normalizedName.match(/(\d+)\s*cm\b/);
  const meters = normalizedName.match(/(\d+)[,.](\d{1,2})\s*m\b/);
  const colors = COLORS.filter((color) => normalizedName.includes(color));
  const stop = new Set(['portas', 'gavetas', 'prateleiras', 'cm', 'm', 'com', 'de', 'para', 'e', 'the', 'a', 'o', 'as', 'os']);
  const tokens = normalizedName.split(/\s+/).filter((word) => word && !stop.has(word));
  const ngrams = tokens.slice(0, -1).map((word, index) => `${word} ${tokens[index + 1]}`);
  return {
    tokens,
    ngrams,
    doors: attribute(/\b(\d+)\s+portas\b/, 12),
    drawers: attribute(/\b(\d+)\s+gavetas\b/, 8),
    shelves: attribute(/\b(\d+)\s+prateleiras\b/, 10),
    widthCm: cm ? Number.parseInt(cm[1], 10) : meters ? Math.round(Number(`${meters[1]}.${meters[2]}`) * 100) : undefined,
    colors,
  };
}

function levenshtein(a: string, b: string) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

function tokenSimilarity(a: string, b: string) {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    if (ratio > 0.7) return 0.9;
    if (ratio > 0.5) return 0.7;
  }
  const similarity = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return similarity >= 0.75 ? similarity : 0;
}

export function createInboundScorerContext(catalog: InboundScorerProduct[]) {
  const entries = catalog.map((product) => {
    const normalized = normalizeInboundProductName(product.comparisonName || product.name);
    return { product, normalized, features: extractFeatures(normalized) };
  });
  const documentFrequency = new Map<string, number>();
  for (const entry of entries) {
    for (const term of new Set([...entry.features.tokens, ...entry.features.ngrams])) documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
  }
  const totalDocs = entries.length;
  const weight = (term: string) => GENERIC.has(term) ? 1.1 : 1 + Math.log10(Math.max(20, totalDocs) / (documentFrequency.get(term) || 1));
  return { entries, totalDocs, weight };
}

/** Replica no mobile a pontuação determinística do ERP; o aceite continua sempre manual. */
export function rankInboundSuggestions(description: string, supplierCode: string | undefined, context: ReturnType<typeof createInboundScorerContext>) {
  if (!description || context.entries.length === 0) return [];
  const normalizedCode = supplierCode ? normalizeInboundProductName(supplierCode) : '';
  const itemFeatures = extractFeatures(normalizeInboundProductName(description));
  const maxTokenScore = itemFeatures.tokens.reduce((sum, token) => sum + context.weight(token), 0)
    + itemFeatures.ngrams.reduce((sum, ngram) => sum + context.weight(ngram) * 2, 0);
  const strongTokens = itemFeatures.tokens.filter((token) => context.weight(token) >= 1.35);

  const scored = context.entries.map((entry) => {
    let score = 0;
    const matches: string[] = [];
    const divergences: string[] = [];
    const codeMatch = normalizedCode.length >= 3 && entry.normalized.includes(normalizedCode);
    if (codeMatch) { score += 150; matches.push(`Código do fornecedor (${supplierCode}) presente no nome.`); }
    let textScore = 0;
    const matchedTokens = new Set<string>();
    for (const token of itemFeatures.tokens) {
      const similarity = Math.max(0, ...entry.features.tokens.map((candidate) => tokenSimilarity(token, candidate)));
      if (similarity > 0) textScore += context.weight(token) * similarity;
      if (similarity >= 0.8) matchedTokens.add(token);
    }
    for (const ngram of itemFeatures.ngrams) if (entry.features.ngrams.includes(ngram)) {
      textScore += context.weight(ngram) * 2;
      matches.push(`Termo exato: "${ngram}"`);
    }
    score += Math.min(75, textScore / Math.max(1, maxTokenScore) * 75);
    if (matchedTokens.size) matches.push(`Sobreposição de termos: ${[...matchedTokens].slice(0, 4).join(', ')}`);

    const candidateStrongTokens = entry.features.tokens.filter((token) => context.weight(token) >= 1.35);
    const missedStrong = strongTokens.filter((token) => !entry.features.tokens.some((candidate) => tokenSimilarity(token, candidate) > 0.8)).length;
    const extraStrong = candidateStrongTokens.filter((token) => !itemFeatures.tokens.some((candidate) => tokenSimilarity(token, candidate) > 0.8)).length;
    if (missedStrong && extraStrong) { score -= 60; divergences.push('Choque de identidade: modelo distinto do informado na NF.'); }
    else if (missedStrong) { score -= 20; divergences.push('Falta termo identificador da NF.'); }

    const compareAttribute = (label: string, itemValue?: number, candidateValue?: number, matchBonus = 8, mismatchPenalty = 40) => {
      if (itemValue === undefined || candidateValue === undefined) return;
      if (itemValue === candidateValue) { score += matchBonus; matches.push(`${itemValue} ${label}`); }
      else { score -= mismatchPenalty; divergences.push(`Diferença em ${label}: NF=${itemValue} vs ERP=${candidateValue}`); }
    };
    compareAttribute('portas', itemFeatures.doors, entry.features.doors, 8, 40);
    compareAttribute('gavetas', itemFeatures.drawers, entry.features.drawers, 8, 40);
    compareAttribute('prateleiras', itemFeatures.shelves, entry.features.shelves, 6, 35);
    if (itemFeatures.colors.length) {
      const common = itemFeatures.colors.filter((color) => entry.features.colors.includes(color));
      if (common.length) { score += 6; matches.push(`Cor compatível: ${common.join(', ')}`); }
      else if (entry.features.colors.length) { score -= 5; divergences.push(`Diferença de cor: NF [${itemFeatures.colors.join(', ')}], ERP [${entry.features.colors.join(', ')}]`); }
    }
    const coverage = itemFeatures.tokens.length ? matchedTokens.size / itemFeatures.tokens.length : 0;
    if (coverage >= 0.8) score += 10;
    else if (coverage >= 0.6) score += 5;
    const confidence = codeMatch ? 99 : Math.max(0, Math.min(99, Math.round(score)));
    return { product: entry.product, score, confidence, reason: matches.join('; ') || 'Compatibilidade geral.', matches, divergences };
  });

  const unique = new Set<string>();
  return scored.sort((a, b) => b.score - a.score).filter((candidate) => {
    if (candidate.confidence < 60) return false;
    const key = `${candidate.product.productId}:${candidate.product.variationId || ''}`;
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  }).slice(0, 1).map(({ product, ...result }) => ({ ...product, ...result }));
}
