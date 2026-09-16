/**
 * Utilitário coeso de normalização textual e extração de atributos para pontuação híbrida
 */

export const normalize = (value: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export interface ExtractedProductFeatures {
  tokens: Set<string>;
  doors?: number;
  drawers?: number;
  widthCm?: number;
  detectedColors: string[];
}

const COMMON_COLORS = [
  'branco', 'preto', 'off white', 'offwhite', 'nature', 'freijo', 'cinamomo',
  'marfim', 'grafite', 'cinza', 'amadeirado', 'nobre', 'ripado', 'castanho',
  'imbuia', 'tauari', 'carvalho', 'perola', 'bege', 'champagne', 'chumbo'
];

export function extractProductFeatures(text: string): ExtractedProductFeatures {
  const norm = normalize(text);
  const words = norm.split(' ').filter(w => w.length >= 2);
  const tokens = new Set(words);

  let doors: number | undefined;
  let drawers: number | undefined;
  let widthCm: number | undefined;

  // Portas (ex: 6p, 6 portas, 6pt)
  const doorsMatch = norm.match(/(\d+)\s*(?:p|pt|portas?)\b/);
  if (doorsMatch) doors = parseInt(doorsMatch[1], 10);

  // Gavetas (ex: 2g, 2 gavetas, 2gav)
  const drawersMatch = norm.match(/(\d+)\s*(?:g|gav|gavetas?)\b/);
  if (drawersMatch) drawers = parseInt(drawersMatch[1], 10);

  // Medida de largura (ex: 120cm, 1.20m, 1200mm, 180cm)
  const widthCmMatch = norm.match(/(\d+)\s*(?:cm)\b/);
  if (widthCmMatch) {
    widthCm = parseInt(widthCmMatch[1], 10);
  } else {
    const meterMatch = norm.match(/(\d+)[,.](\d{1,2})\s*m\b/);
    if (meterMatch) widthCm = Math.round(parseFloat(`${meterMatch[1]}.${meterMatch[2]}`) * 100);
  }

  const detectedColors = COMMON_COLORS.filter(c => norm.includes(c));

  return { tokens, doors, drawers, widthCm, detectedColors };
}

export function computeFeatureMatchScore(
  nfFeatures: ExtractedProductFeatures,
  productFeatures: ExtractedProductFeatures
): { score: number; matches: string[]; divergences: string[] } {
  let score = 0;
  const matches: string[] = [];
  const divergences: string[] = [];

  // 1. Tokens em comum (Jaccard ponderado)
  const commonTokens = [...nfFeatures.tokens].filter(t => t.length >= 3 && productFeatures.tokens.has(t));
  if (commonTokens.length > 0) {
    const tokenScore = Math.min(40, commonTokens.length * 8);
    score += tokenScore;
    matches.push(`Termos coincidentes: ${commonTokens.slice(0, 4).join(', ')}`);
  }

  // 2. Portas
  if (nfFeatures.doors !== undefined && productFeatures.doors !== undefined) {
    if (nfFeatures.doors === productFeatures.doors) {
      score += 15;
      matches.push(`${nfFeatures.doors} Portas coincidente`);
    } else {
      score -= 10;
      divergences.push(`NF indica ${nfFeatures.doors} portas, mas ERP indica ${productFeatures.doors}`);
    }
  }

  // 3. Gavetas
  if (nfFeatures.drawers !== undefined && productFeatures.drawers !== undefined) {
    if (nfFeatures.drawers === productFeatures.drawers) {
      score += 15;
      matches.push(`${nfFeatures.drawers} Gavetas coincidente`);
    } else {
      score -= 10;
      divergences.push(`NF indica ${nfFeatures.drawers} gavetas, mas ERP indica ${productFeatures.drawers}`);
    }
  }

  // 4. Medida / Largura
  if (nfFeatures.widthCm !== undefined && productFeatures.widthCm !== undefined) {
    if (Math.abs(nfFeatures.widthCm - productFeatures.widthCm) <= 2) {
      score += 15;
      matches.push(`Medida aproximada coincidente (~${nfFeatures.widthCm}cm)`);
    } else {
      score -= 5;
    }
  }

  // 5. Cores
  const commonColors = nfFeatures.detectedColors.filter(c => productFeatures.detectedColors.includes(c));
  if (commonColors.length > 0) {
    score += 15;
    matches.push(`Cor detectada coincidente: ${commonColors.join(', ')}`);
  }

  return { score: Math.max(0, score), matches, divergences };
}
