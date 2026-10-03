import { removeAccents } from './textUtils';

export interface CategoryCandidate {
  id: string;
  name?: string;
  category?: string;
}

export interface RankedCategoryCandidate {
  category: CategoryCandidate;
  score: number;
  matchedAlias: string;
}

type CategoryAliasRule = {
  readonly category: string;
  readonly aliases: readonly string[];
};

// Aliases foram conferidos contra os nomes das categorias e produtos já classificados
// no catálogo MoranteHub; abreviações como "G ROUPA" vêm do histórico real.
const CATEGORY_ALIAS_RULES: readonly CategoryAliasRule[] = [
  {
    category: 'Guarda-Roupas',
    aliases: ['guarda roupa', 'roupeiro', 'armario roupa', 'g roupa', 'armario de quarto'],
  },
  {
    category: 'Balcões para Pia',
    aliases: [
      'balcao pia',
      'balcao de pia',
      'balcao para pia',
      'gabinete pia',
      'gabinete para pia',
    ],
  },
  { category: 'Balcões para Cooktop', aliases: ['balcao cooktop', 'balcao para cooktop'] },
  { category: 'Balcões com Fruteiras', aliases: ['balcao fruteira', 'balcao com fruteira'] },
  { category: 'Balcões com Tampo', aliases: ['balcao com tampo', 'balcao tampo'] },
  {
    category: 'Balcões para Filtro de Àgua',
    aliases: ['balcao filtro', 'balcao para filtro', 'balcao para agua'],
  },
  { category: 'Armários Aéreos', aliases: ['armario aereo', 'armarios aereos', 'aereo cozinha'] },
  {
    category: 'Armários para Fornos',
    aliases: ['armario forno', 'armario para forno', 'torre quente'],
  },
  { category: 'Paneleiros', aliases: ['paneleiro', 'paneleiros', 'armario paneleiro'] },
  {
    category: 'Cozinhas Moduladas e Compactas',
    aliases: ['cozinha modulada', 'cozinha compacta', 'jogo de cozinha', 'cozinha planejada'],
  },
  { category: 'Conjunto para Sala de Jantar', aliases: ['conjunto sala jantar', 'cj sala jantar'] },
  { category: 'Mesa para Sala de Jantar', aliases: ['mesa sala jantar', 'mesa para jantar'] },
  { category: 'Cadeiras para Sala de Jantar', aliases: ['cadeira sala jantar', 'cadeiras jantar'] },
  {
    category: 'Mesas para Escritório',
    aliases: ['mesa escritorio', 'escrivaninha', 'mesa para escritorio'],
  },
  {
    category: 'Cadeiras para Escritório',
    aliases: ['cadeira escritorio', 'cadeira para escritorio'],
  },
  { category: 'Conjuntos para Banheiro', aliases: ['conjunto banheiro', 'conjunto para banheiro'] },
  {
    category: 'Espelheira para Banheiro',
    aliases: ['espelheira banheiro', 'espelheira para banheiro'],
  },
  { category: 'Cristaleiras', aliases: ['cristaleira'] },
  { category: 'Berços', aliases: ['berco', 'mini cama bebe'] },
  { category: 'Cômodas', aliases: ['comoda'] },
  { category: 'Sapateiras', aliases: ['sapateira'] },
  { category: 'Cabeceiras', aliases: ['cabeceira'] },
  { category: 'Beliches', aliases: ['beliche'] },
  { category: 'Treliches', aliases: ['treliche'] },
  { category: 'Colchões', aliases: ['colchao'] },
  {
    category: 'Camas/Bases Box',
    aliases: ['cama box', 'base box', 'base bau', 'cama casal', 'cama solteiro'],
  },
  {
    category: 'Mesas de Cabeceira',
    aliases: ['mesa cabeceira', 'criado mudo', 'mesa de cabeceira'],
  },
  { category: 'Aparadores Buffets', aliases: ['aparador sala', 'buffet sala'] },
  { category: 'Racks', aliases: ['rack tv', 'rack para tv', 'rack'] },
  { category: 'Painéis', aliases: ['painel tv', 'painel para tv'] },
  { category: 'Homes', aliases: ['home para tv', 'home tv'] },
  { category: 'Estantes', aliases: ['estante'] },
  { category: 'Poltronas', aliases: ['poltrona'] },
  { category: 'Sofás', aliases: ['sofa', 'sofa cama'] },
  { category: 'Penteadeiras', aliases: ['penteadeira'] },
  { category: 'Armários Multiuso', aliases: ['armario multiuso', 'multiuso'] },
  { category: 'Pias', aliases: ['pia de granito', 'pia de marmore', 'pia inox'] },
  { category: 'Tampos', aliases: ['tampo para balcao', 'tampo de balcao'] },
];

const IGNORE_TOKENS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'em', 'por']);
const BATHROOM_CONTEXT = ['banheiro', 'banho'];
const KITCHEN_CATEGORIES = new Set([
  'balcoes para pia',
  'balcoes para cooktop',
  'balcoes com fruteiras',
  'balcoes com tampo',
  'balcoes para filtro de agua',
  'armarios aereos',
  'armarios para fornos',
  'paneleiros',
  'cozinhas moduladas e compactas',
]);

function normalize(value: string): string {
  return removeAccents(value || '')
    .toLowerCase()
    .replace(/\bg\s+roupa\b/g, 'guarda roupa')
    .replace(/\b(\d+)\s*pt\b/g, '$1 portas')
    .replace(/\b(\d+)\s*p\b/g, '$1 portas')
    .replace(/\b(\d+)\s*gv\b/g, '$1 gavetas')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const diagonal = previous;
      previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return row[b.length];
}

function tokenMatches(input: string, expected: string): boolean {
  if (
    input === expected ||
    (input.length > 3 && input.replace(/s$/, '') === expected.replace(/s$/, ''))
  ) {
    return true;
  }
  if (Math.min(input.length, expected.length) < 5) return false;
  return levenshteinDistance(input, expected) === 1;
}

function aliasScore(titleTokens: readonly string[], alias: string): number {
  const aliasTokens = normalize(alias)
    .split(' ')
    .filter((token) => !IGNORE_TOKENS.has(token));
  if (!aliasTokens.length) return 0;

  let matched = 0;
  let fuzzy = false;
  for (const expected of aliasTokens) {
    const found = titleTokens.find((token) => tokenMatches(token, expected));
    if (found) {
      matched += 1;
      if (found !== expected && found.replace(/s$/, '') !== expected.replace(/s$/, ''))
        fuzzy = true;
    }
  }

  if (!matched) return 0;
  const coverage = matched / aliasTokens.length;
  const score = 0.55 + coverage * 0.42 - (fuzzy ? 0.055 : 0);
  return Math.round(score * 100) / 100;
}

function matchingRule(categoryName: string): CategoryAliasRule | undefined {
  const normalizedName = normalize(categoryName);
  return CATEGORY_ALIAS_RULES.find((rule) => normalize(rule.category) === normalizedName);
}

export function rankCategoryCandidates(
  title: string,
  categories: readonly CategoryCandidate[]
): RankedCategoryCandidate[] {
  if (!title?.trim() || !categories?.length) return [];

  const normalizedTitle = normalize(title);
  const titleTokens = normalizedTitle.split(' ').filter((token) => !IGNORE_TOKENS.has(token));
  const hasBathroomContext = BATHROOM_CONTEXT.some((token) => titleTokens.includes(token));
  const scores: RankedCategoryCandidate[] = [];

  for (const category of categories) {
    const categoryName = category.name || category.category || '';
    if (!categoryName) continue;

    const normalizedCategory = normalize(categoryName);
    if (hasBathroomContext && KITCHEN_CATEGORIES.has(normalizedCategory)) continue;

    const rule = matchingRule(categoryName);
    const aliases = rule?.aliases || [categoryName];
    let best = { score: 0, matchedAlias: '' };
    for (const alias of aliases) {
      const score = aliasScore(titleTokens, alias);
      if (score > best.score) best = { score, matchedAlias: alias };
    }
    if (best.score > 0) scores.push({ category, ...best });
  }

  return scores.sort(
    (a, b) => b.score - a.score || (a.category.name || '').localeCompare(b.category.name || '')
  );
}

const AUTO_SELECT_MIN_SCORE = 0.86;
const AUTO_SELECT_MIN_MARGIN = 0.12;

export function matchCategoryByRules(
  title: string,
  categories: readonly CategoryCandidate[]
): CategoryCandidate | null {
  const ranked = rankCategoryCandidates(title, categories);
  const [best, second] = ranked;
  if (!best || best.score < AUTO_SELECT_MIN_SCORE) return null;
  if (second && best.score - second.score < AUTO_SELECT_MIN_MARGIN) return null;
  return best.category;
}

export function keepManualCategorySelection(
  selectedIds: readonly string[],
  suggestedId: string | null | undefined
): string[] {
  if (selectedIds.length || !suggestedId) return [...selectedIds];
  return [suggestedId];
}

/** Resolve automaticamente apenas com regras locais; nunca chama serviços de IA. */
export async function resolveAutoCategory(
  title: string,
  availableCategories: readonly CategoryCandidate[]
): Promise<CategoryCandidate | null> {
  return matchCategoryByRules(title, availableCategories);
}
