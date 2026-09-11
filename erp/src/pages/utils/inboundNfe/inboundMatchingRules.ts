/**
 * Regras de Domínio e Similaridade Semântica de Produtos da NF-e com o Catálogo do ERP.
 * Camada de Domínio Puro (sem dependências de UI ou React).
 */

export const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'com', 'em', 'para', 'p/', 'un', 'cx', 'pc',
  'tx', 'pt', 'pts', 'portas', 'porta', 'gavetas', 'gaveta', 'mm', 'cm', 'mt'
]);

export const CATEGORY_MAP = [
  { type: 'mesa_jantar', terms: ['mesa', 'cadeira', 'cadeiras', 'jantar', 'sala de jantar', 'cj jantar', 'sala jantar'] },
  { type: 'rack', terms: ['rack', 'painel', 'bancada', 'estante'] },
  { type: 'guarda_roupa', terms: ['guarda roupa', 'guarda-roupa', 'roupeiro', 'closet'] },
  { type: 'comoda', terms: ['comoda', 'gaveteiro', 'sapateira'] },
  { type: 'sofa', terms: ['sofa', 'estofado', 'poltrona', 'puff'] },
  { type: 'cama', terms: ['cama', 'beliche', 'treliche', 'berco'] },
  { type: 'colchao', terms: ['colchao', 'box', 'sommier'] },
  { type: 'cozinha', terms: ['cozinha', 'armario', 'balcao', 'paneleiro', 'aereo', 'gabinete'] },
  { type: 'escritorio', terms: ['escrivaninha', 'mesa para escritorio', 'mesa escritorio'] },
];

export const KNOWN_BRANDS = [
  'valdemoveis', 'notavel', 'demobile', 'gelius', 'aramoveis', 'faimec',
  'telasul', 'indekes', 'luciane', 'viero', 'damulti', 'mobikasa', 'poquema',
  'cristalflex', 'formspuma', 'doripel', 'qmovi', 'artely', 'castro', 'nesher',
  'madetal', 'evidencia', 'mopar', 'darmovel'
];

/** Extrai tokens alfanuméricos significativos sem acentos ou stop-words */
export function extractMeaningfulTokens(text: string): string[] {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

/** Detecta a categoria predominante baseando-se em termos moveleiros */
export function detectProductCategory(text: string): string | null {
  const norm = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const cat of CATEGORY_MAP) {
    if (cat.terms.some((t) => norm.includes(t))) return cat.type;
  }
  return null;
}

/**
 * Calcula pontuação de correspondência entre um produto do ERP e a descrição do item da NF.
 * Retorna score positivo se compatível ou 0 se descartado (ex: categorias conflitantes).
 */
export function calculateProductMatchScore(prodName: string, nfText: string): number {
  const nfTokens = extractMeaningfulTokens(nfText);
  const prodTokens = extractMeaningfulTokens(prodName);
  if (!prodTokens.length || !nfTokens.length) return 0;

  const prodCategory = detectProductCategory(prodName);
  const nfCategory = detectProductCategory(nfText);

  // Se ambas têm categorias bem definidas e são incompatíveis (ex: Rack vs Escrivaninha/Cômoda), descarta
  if (prodCategory && nfCategory && prodCategory !== nfCategory) {
    return 0;
  }

  const commonTokens = prodTokens.filter((t) => nfTokens.includes(t));
  const hasModelNumber = prodTokens.some((t) => /\d{3,}/.test(t) && nfTokens.includes(t));
  const hasBrandMatch = prodTokens.some((t) => KNOWN_BRANDS.includes(t) && nfTokens.includes(t));
  const sameCategory = Boolean(prodCategory && nfCategory && prodCategory === nfCategory);

  let score = commonTokens.length * 4;
  if (hasBrandMatch) score += 12;
  if (hasModelNumber) score += 15;
  if (sameCategory) score += 8;

  const matchRatio = commonTokens.length / prodTokens.length;
  score += Math.round(matchRatio * 10);

  const isValid =
    (hasModelNumber && score >= 15) ||
    (hasBrandMatch && sameCategory && score >= 16) ||
    (hasBrandMatch && commonTokens.length >= 1 && score >= 16) ||
    (commonTokens.length >= 2 && matchRatio >= 0.4 && score >= 14);

  return isValid ? score : 0;
}

export const KNOWN_FURNITURE_COLORS = [
  'cinamomo/off/veludo bege', 'cinamomo/off white', 'cinamomo/off', 'cinamomo/nature',
  'cinamomo/grafite', 'cinamomo/preto', 'cinamomo', 'nature/off white', 'nature/off',
  'nature/preto', 'nature/grafite', 'nature', 'freijo/off white', 'freijo/off',
  'freijo/preto', 'freijo/grafite', 'freijo', 'imbuia/off white', 'imbuia/off',
  'imbuia', 'cedro', 'marfim', 'castanho', 'nogueira', 'carvalho', 'amendoa',
  'off white/veludo bege', 'off white', 'off-white', 'branco brilho', 'branco fosco',
  'branco acetinado', 'branco', 'preto fosco', 'preto brilho', 'preto',
  'grafite', 'cinza chumbo', 'cinza claro', 'cinza', 'veludo bege', 'veludo cinza',
  'veludo marrom', 'veludo azul', 'veludo verde', 'suede bege', 'suede cinza',
  'suede marrom', 'bege', 'capuccino', 'marrom', 'azul', 'rosa', 'verde'
];

/**
 * Heurística local ultrarrápida de extração de cor em descrições de móveis.
 * Útil como fallback resiliente e para testes determinísticos.
 */
export function extractColorCandidateFromTitle(description: string): string | null {
  const norm = String(description || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  for (const color of KNOWN_FURNITURE_COLORS) {
    const escaped = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
    if (regex.test(norm)) {
      // Formata em formato legível Title Case
      return color
        .split('/')
        .map((segment) => segment.trim().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
        .join('/');
    }
  }
  return null;
}

