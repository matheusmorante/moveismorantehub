// Product name formatting helpers used by mobile order and delivery views.

export const formatItemNameExact = (item: any): string => {
  if (!item) return 'Móvel';
  const raw =
    item.description ||
    item.name ||
    item.title ||
    item.productName ||
    item.product_name ||
    item.product ||
    '';
  if (!raw) return 'Móvel';
  const itemName =
    String(raw)
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .trim() || String(raw);
  const observation =
    typeof item.observation === 'string'
      ? item.observation.trim()
      : typeof item.observations === 'string'
        ? item.observations.trim()
        : '';

  return observation ? `${itemName} - ${observation}` : itemName;
};

const PRODUCT_NAME_SMALL_WORDS = new Set([
  'a',
  'as',
  'o',
  'os',
  'e',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'para',
  'por',
  'com',
  'sem',
]);
const PRODUCT_NAME_ACRONYMS: Record<string, string> = {
  abnt: 'ABNT',
  led: 'LED',
  mdf: 'MDF',
  mdp: 'MDP',
  rgb: 'RGB',
  tv: 'TV',
  usb: 'USB',
  pvc: 'PVC',
};

/** Formats stored product names for readable UI without changing persisted values. */
export const formatItemDisplayName = (item: any): string => {
  const rawName = formatItemNameExact(item).trim();
  if (!rawName) return rawName;

  return rawName
    .split(/\s+/)
    .map((word, index) => {
      const lowerWord = word.toLocaleLowerCase('pt-BR');
      const acronym = PRODUCT_NAME_ACRONYMS[lowerWord];
      if (acronym) return acronym;
      if (index > 0 && PRODUCT_NAME_SMALL_WORDS.has(lowerWord)) return lowerWord;

      return lowerWord.replace(
        /(^|[-/])([a-zà-öø-ÿ])/g,
        (_match, separator: string, letter: string) =>
          `${separator}${letter.toLocaleUpperCase('pt-BR')}`
      );
    })
    .join(' ');
};

export const formatItemsListSummary = (items: any[]): string => {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .filter(Boolean)
    .map((i: any) => {
      const qty = Number(i.quantity || i.qty || 1);
      const name = formatItemNameExact(i);
      return `${qty}x ${name}`;
    })
    .join(', ');
};

// Abrevia e simplifica o nome do produto (removendo cores, combinações, numerações e metragens)
export const simplifyProductName = (rawName: string): string => {
  if (!rawName) return 'móvel';
  let cleaned = rawName
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\b[\w\u00C0-\u024F]+(?:\/[\w\u00C0-\u024F]+)+\b/g, '')
    .replace(
      /\b\d+([.,]\d+)?([xX]\d+([.,]\d+)?)?\s*(cm|m|mm|kg|l|portas|gavetas|lugares|cadeiras)?\b/gi,
      ''
    )
    .replace(/\b\d+\b/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const colorWords = new Set([
    'freijo',
    'freijó',
    'off',
    'white',
    'offwhite',
    'preto',
    'preta',
    'branco',
    'branca',
    'cinamomo',
    'grafite',
    'nobre',
    'imbuia',
    'carvalho',
    'nogueira',
    'amêndoa',
    'amendoa',
    'patina',
    'pátina',
    'cacau',
    'savana',
    'nature',
    'jequitiba',
    'jequitibá',
    'cedro',
    'marrom',
    'cinza',
    'bege',
    'areia',
    'champagne',
    'champanhe',
    'castanho',
    'fendi',
    'ébano',
    'ebano',
    'mel',
    'amarelo',
    'azul',
    'verde',
    'rosa',
    'vermelho',
    'dourado',
    'prata',
    'portas',
    'gavetas',
    'lugares',
    'cadeiras',
    'cm',
    'mm',
    'm',
  ]);

  const words = cleaned.split(/\s+/).filter(Boolean);
  const filteredWords = words.filter((w) => !colorWords.has(w.toLowerCase().trim()));

  if (filteredWords.length === 0) return 'móvel';
  return filteredWords.slice(0, 3).join(' ');
};
