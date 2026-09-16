import type { SupplierProductSummary } from './inboundSupplierProductContext';
import type { InboundProductCandidate } from '../../aiService/aiInboundProductSuggestions';

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
    'branco', 'preto', 'off white', 'offwhite', 'nature', 'freijo', 'cinamomo',
    'marfim', 'grafite', 'cinza', 'amadeirado', 'nobre', 'ripado', 'castanho',
    'imbuia', 'tauari', 'carvalho', 'perola', 'bege', 'champagne', 'chumbo',
    'amendoa', 'mel', 'cafe', 'cerejeira', 'nogal', 'macadamia', 'jacaranda'
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
    'roupeiro': 'guarda_roupa',
    'gab': 'balcao',
    'gabinete': 'balcao',
    'porta': 'portas',
    'gaveta': 'gavetas',
    'prateleira': 'prateleiras',
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
            return (v >= 1 && v <= max) ? `${num} ${canonical}` : match;
        });
    }

    // 3a. Sinônimos compostos
    for (const { from, to } of COMPOUND_SYNONYMS) {
        norm = norm.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    }

    // 3b. Sinônimos simples (token a token)
    const words = norm.split(/\s+/).map(w => WORD_SYNONYMS[w] ?? w);
    norm = words.join(' ');

    // 4. Remove pontuação solta em bordas de tokens
    norm = norm.split(/\s+/).map(w => w.replace(/^[.,]+|[.,]+$/g, '')).filter(w => w.length > 0).join(' ');

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
        return (v >= 1 && v <= max) ? v : undefined;
    };

    const doors   = tryExtractAttr(/\b(\d+)\s+portas\b/, 12);
    const drawers  = tryExtractAttr(/\b(\d+)\s+gavetas\b/, 8);
    const shelves  = tryExtractAttr(/\b(\d+)\s+prateleiras\b/, 10);

    let widthCm: number | undefined;
    const widthCmMatch = normalizedName.match(/(\d+)\s*cm\b/);
    if (widthCmMatch) {
        widthCm = parseInt(widthCmMatch[1], 10);
    } else {
        const meterMatch = normalizedName.match(/(\d+)[,.]( \d{1,2})\s*m\b/);
        if (meterMatch) widthCm = Math.round(parseFloat(`${meterMatch[1]}.${meterMatch[2].trim()}`) * 100);
    }

    const colors = COMMON_COLORS.filter(c => normalizedName.includes(c));

    // Remove marcadores de atributo dos tokens de comparação — eles já foram extraídos estruturalmente
    const STOP_TOKENS = new Set(['portas', 'gavetas', 'prateleiras', 'cm', 'm', 'com', 'de', 'para', 'e', 'the', 'a', 'o', 'as', 'os']);
    const filteredTokens = normalizedName
        .split(/\s+/)
        .filter(w => w.length > 0 && !STOP_TOKENS.has(w));

    // N-Grams (Bigrams) para contextos de identidade como "new xangai"
    const ngrams: string[] = [];
    for (let i = 0; i < filteredTokens.length - 1; i++) {
        ngrams.push(`${filteredTokens[i]} ${filteredTokens[i+1]}`);
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

const GENERIC_TERMS = new Set([
    'guarda_roupa', 'roupeiro', 'balcao', 'mesa', 'cadeira', 'cabeceira', 'armario', 'estante', 
    'painel', 'rack', 'cama', 'colchao', 'sofa', 'poltrona', 'cozinha', 'quarto', 'sala',
    'mdf', 'mdp', 'madeira', 'aco', 'vidro', 'espelho', 'branco', 'preto', 'cinza', 'off', 'white',
    'doripel', 'madesa', 'kappesberg', 'itatiaia', 'g', 'roupa' // 'g' can be abbreviation for guarda
]);

export class InboundDeterministicScorerContext {
    idf: Map<string, number> = new Map();
    totalDocs: number = 0;
    
    // Cache the normalized forms and features of the catalog
    catalogCache: Array<{
        productId: string;
        variationId?: string;
        displayName: string;
        norm: string;
        features: ExtractedFeatures;
    }> = [];

    constructor(products: SupplierProductSummary[]) {
        const df = new Map<string, number>();
        let docCount = 0;

        const indexFeatures = (features: ExtractedFeatures) => {
            const uniqueTerms = new Set([...features.tokens, ...features.ngrams]);
            uniqueTerms.forEach(t => df.set(t, (df.get(t) || 0) + 1));
            docCount++;
        };

        products.forEach(p => {
            const pNorm = normalizeProductName(p.name);
            const pFeatures = extractFeatures(pNorm);
            
            if (p.variations && p.variations.length > 0) {
                p.variations.forEach(v => {
                    const displayName = `${p.name} ${v.name}`;
                    const vNorm = normalizeProductName(displayName);
                    const vFeatures = extractFeatures(vNorm);
                    
                    this.catalogCache.push({ productId: p.id, variationId: v.id, displayName, norm: vNorm, features: vFeatures });
                    indexFeatures(vFeatures);
                });
            } else {
                this.catalogCache.push({ productId: p.id, variationId: undefined, displayName: p.name, norm: pNorm, features: pFeatures });
                indexFeatures(pFeatures);
            }
        });

        this.totalDocs = docCount;
        const effectiveTotal = Math.max(20, this.totalDocs);
        df.forEach((count, term) => {
            if (GENERIC_TERMS.has(term)) {
                this.idf.set(term, 1.1); // Always common
            } else {
                this.idf.set(term, 1 + Math.log10(effectiveTotal / count));
            }
        });
    }

    getTokenWeight(token: string): number {
        if (GENERIC_TERMS.has(token)) return 1.1;
        return this.idf.get(token) ?? (1 + Math.log10(Math.max(20, this.totalDocs) / 1));
    }
}

export interface DeterministicScoringResult {
    candidates: InboundProductCandidate[];
    isConclusive: boolean;
    topCandidate?: InboundProductCandidate;
}

export function rankAndScoreDeterministic(
    nfDescription: string,
    nfCode: string | undefined,
    context: InboundDeterministicScorerContext
): DeterministicScoringResult {
    if (!nfDescription || context.catalogCache.length === 0) {
        return { candidates: [], isConclusive: false };
    }

    const nfNormCode = nfCode ? normalizeProductName(nfCode) : '';
    const nfNorm = normalizeProductName(nfDescription);
    const nfFeatures = extractFeatures(nfNorm);

    // Calculate max possible token score for normalization
    const maxTokenScore = nfFeatures.tokens.reduce((sum, t) => sum + context.getTokenWeight(t), 0) +
                          nfFeatures.ngrams.reduce((sum, g) => sum + (context.getTokenWeight(g) * 2.0), 0);
                          
    const STRONG_IDF_THRESHOLD = 1.35; // Termos muito discriminantes (modelos)
    const nfStrongTokens = nfFeatures.tokens.filter(t => context.getTokenWeight(t) >= STRONG_IDF_THRESHOLD);
    
    const scoredEntries: Array<{ candidate: InboundProductCandidate, score: number, isSupplierCodeMatch: boolean }> = [];

    for (const cat of context.catalogCache) {
        let baseScore = 0;
        const matches: string[] = [];
        const divergences: string[] = [];
        
        let isSupplierCodeMatch = false;
        if (nfNormCode && cat.norm.includes(nfNormCode) && nfNormCode.length >= 3) {
            isSupplierCodeMatch = true;
            baseScore += 150; // Huge boost for supplier code
            matches.push(`Código do fornecedor (${nfCode}) presente no nome.`);
        }

        // 1. Text Similarity (Tokens & N-Grams)
        let textScore = 0;
        const matchedTokens = new Set<string>();
        
        for (const nfToken of nfFeatures.tokens) {
            let bestSim = 0;
            for (const catToken of cat.features.tokens) {
                const sim = tokenSimilarity(nfToken, catToken);
                if (sim > bestSim) bestSim = sim;
            }
            if (bestSim > 0) {
                textScore += (context.getTokenWeight(nfToken) * bestSim);
                if (bestSim >= 0.8) matchedTokens.add(nfToken);
            }
        }
        
        for (const nfNgram of nfFeatures.ngrams) {
            if (cat.features.ngrams.includes(nfNgram)) {
                textScore += (context.getTokenWeight(nfNgram) * 2.0); // Multiplier for sequence
                matches.push(`Termo exato: "${nfNgram}"`);
            }
        }
        
        const maxTextCeiling = Math.max(1, maxTokenScore * 1.0);
        const normalizedTextScore = Math.min(75, (textScore / maxTextCeiling) * 75); // Identity rules the score
        baseScore += normalizedTextScore;

        if (matchedTokens.size > 0) {
            matches.push(`Sobreposição de termos: ${Array.from(matchedTokens).slice(0, 4).join(', ')}`);
        }

        // 1.5 PENALTY FOR DIVERGENT IDENTITY (CHOQUE DE MODELOS)
        const candStrongTokens = cat.features.tokens.filter(t => context.getTokenWeight(t) >= STRONG_IDF_THRESHOLD);
        
        let nfMissedStrong = 0;
        for (const t of nfStrongTokens) {
            if (!cat.features.tokens.some(ct => tokenSimilarity(t, ct) > 0.8)) nfMissedStrong++;
        }
        
        let candExtraStrong = 0;
        for (const t of candStrongTokens) {
            if (!nfFeatures.tokens.some(nft => tokenSimilarity(t, nft) > 0.8)) candExtraStrong++;
        }
        
        if (nfMissedStrong > 0 && candExtraStrong > 0) {
            baseScore -= 60;
            divergences.push(`Choque de Identidade: Produto possui termos distintivos conflitantes com a NF.`);
        } else if (nfMissedStrong > 0) {
            baseScore -= 20;
            divergences.push(`Falta termo identificador da NF.`);
        }

        // 2. Attributes Score
        if (nfFeatures.doors !== undefined) {
            if (cat.features.doors !== undefined) {
                if (nfFeatures.doors === cat.features.doors) {
                    baseScore += 8;
                    matches.push(`${nfFeatures.doors} portas`);
                } else {
                    baseScore -= 40;
                    divergences.push(`Diferença nas portas: NF=${nfFeatures.doors} vs ERP=${cat.features.doors}`);
                }
            }
        }

        if (nfFeatures.drawers !== undefined) {
            if (cat.features.drawers !== undefined) {
                if (nfFeatures.drawers === cat.features.drawers) {
                    baseScore += 8;
                    matches.push(`${nfFeatures.drawers} gavetas`);
                } else {
                    baseScore -= 40;
                    divergences.push(`Diferença nas gavetas: NF=${nfFeatures.drawers} vs ERP=${cat.features.drawers}`);
                }
            }
        }

        if (nfFeatures.shelves !== undefined) {
            if (cat.features.shelves !== undefined) {
                if (nfFeatures.shelves === cat.features.shelves) {
                    baseScore += 6;
                    matches.push(`${nfFeatures.shelves} prateleiras`);
                } else {
                    baseScore -= 35;
                    divergences.push(`Diferença nas prateleiras: NF=${nfFeatures.shelves} vs ERP=${cat.features.shelves}`);
                }
            }
        }

        if (nfFeatures.colors.length > 0) {
            const commonColors = nfFeatures.colors.filter(c => cat.features.colors.includes(c));
            if (commonColors.length > 0) {
                baseScore += 6;
                matches.push(`Cor compatível: ${commonColors.join(', ')}`);
            } else if (cat.features.colors.length > 0) {
                baseScore -= 5;
                divergences.push(`Diferença de cor: NF tem [${nfFeatures.colors.join(', ')}], ERP tem [${cat.features.colors.join(', ')}]`);
            }
        }

        // 4. Token coverage bonus
        const coverageRatio = nfFeatures.tokens.length > 0 ? matchedTokens.size / nfFeatures.tokens.length : 0;
        if (coverageRatio >= 0.80) {
            baseScore += 10;
        } else if (coverageRatio >= 0.60) {
            baseScore += 5;
        }

        // Clamp the confidence score to 0-99 max (100 is reserved for perfect deterministic match)
        let confidence = Math.max(0, Math.min(99, Math.round(baseScore)));

        
        if (isSupplierCodeMatch) {
            confidence = 99;
        }

        scoredEntries.push({
            candidate: {
                productId: cat.productId,
                variationId: cat.variationId,
                displayName: cat.displayName,
                confidence,
                reason: matches.join('; ') || 'Compatibilidade geral.',
                matches,
                divergences
            },
            score: baseScore,
            isSupplierCodeMatch
        });
    }

    scoredEntries.sort((a, b) => b.score - a.score);

    // Filter duplicates and only keep scores >= THRESHOLD (60)
    const THRESHOLD = 60;
    const seen = new Set<string>();
    const topCandidates: InboundProductCandidate[] = [];

    for (const entry of scoredEntries) {
        if (entry.candidate.confidence < THRESHOLD) continue;
        
        const key = `${entry.candidate.productId}:${entry.candidate.variationId || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            topCandidates.push(entry.candidate);
        }
        if (topCandidates.length >= 3) break;
    }

    const first = topCandidates[0];
    const second = topCandidates[1];

    const isConclusive = Boolean(
        first && (first.confidence >= 95 ||
        (first.confidence >= 85 && (!second || (first.confidence - second.confidence >= 15))))
    );

    return {
        candidates: topCandidates,
        isConclusive,
        topCandidate: first
    };
}
