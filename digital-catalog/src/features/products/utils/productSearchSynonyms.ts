/**
 * Normaliza strings para busca removendo acentos, pontuações e espaçamentos repetidos.
 */
export const normalizeSearch = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Retorna variações sinonímicas de palavras comuns do catálogo mobiliário para busca resiliente.
 */
export const getSynonyms = (token: string): string[] => {
  const norm = token.toLowerCase().trim().replace(/s$/, '');
  if (norm === 'roupa' || norm === 'guarda' || norm === 'roupeiro' || norm === 'guardaroupa') {
    return [
      'roupa',
      'roupas',
      'guarda',
      'roupeiro',
      'roupeiros',
      'guarda-roupa',
      'guarda roupa',
    ];
  }
  if (norm === 'sofa' || norm === 'estofado') {
    return ['sofa', 'sofas', 'estofado', 'estofados'];
  }
  if (norm === 'colchao' || norm === 'espuma' || norm === 'mola') {
    return ['colchao', 'colchoes'];
  }
  if (norm === 'cama' || norm === 'box' || norm === 'sommier') {
    return ['cama', 'camas', 'box'];
  }
  if (norm === 'mesa') {
    return ['mesa', 'mesas'];
  }
  if (norm === 'painel') {
    return ['painel', 'paineis'];
  }
  if (norm === 'rack') {
    return ['rack', 'racks'];
  }
  if (norm === 'balcao') {
    return ['balcao', 'balcoes'];
  }
  if (norm === 'pia') {
    return ['pia', 'pias'];
  }
  if (norm === 'armario') {
    return ['armario', 'armarios'];
  }
  if (norm === 'multiuso') {
    return ['multiuso', 'multiusos'];
  }
  if (norm === 'cadeira') {
    return ['cadeira', 'cadeiras'];
  }
  if (norm === 'banqueta') {
    return ['banqueta', 'banquetas'];
  }
  if (norm === 'comoda') {
    return ['comoda', 'comodas'];
  }
  if (norm === 'cabeceira') {
    return ['cabeceira', 'cabeceiras'];
  }
  if (norm === 'sapateira') {
    return ['sapateira', 'sapateiras'];
  }
  if (norm === 'cristaleira') {
    return ['cristaleira', 'cristaleiras'];
  }
  if (norm === 'escrivaninha') {
    return ['escrivaninha', 'escrivaninhas', 'mesa'];
  }
  return [token, `${token}s`, norm];
};

/**
 * Valida se o texto de um produto coincide com palavras-chave e sinônimos de um ambiente.
 */
export const matchesEnvironmentKeywords = (
  fullText: string,
  envCategoryNames: string[]
): boolean => {
  return envCategoryNames.some((envName) => {
    const tokens = envName
      .split(' ')
      .filter(
        (t) =>
          t.length >= 2 && !['de', 'da', 'do', 'dos', 'das', 'para', 'com', 'em'].includes(t)
      );
    if (tokens.length === 0) return true;
    return tokens.some((token) => {
      const syns = getSynonyms(token);
      return syns.some((syn) => fullText.includes(syn));
    });
  });
};
