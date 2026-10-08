const lowercaseWords = new Set([
  'de',
  'da',
  'do',
  'dos',
  'das',
  'para',
  'pra',
  'pro',
  'pras',
  'pros',
  'com',
  'e',
  'em',
  'a',
  'o',
  'as',
  'os',
  'por',
  'sem',
  'ou',
  'que',
  'no',
  'na',
  'nos',
  'nas',
  'pelo',
  'pela',
  'pelos',
  'pelas',
  'ao',
  'aos',
  'à',
  'às',
  'um',
  'uma',
  'uns',
  'umas',
  'sob',
  'sobre',
  'ate',
  'até',
]);

const knownAcronyms = new Set([
  'tv',
  'led',
  'mdf',
  'mdp',
  'usb',
  'rgb',
  'pvc',
  'eva',
  'hd',
  '4k',
  'bivolt',
  'sku',
  'un',
]);

function capitalizeWordToken(token: string, isFirstInText: boolean): string {
  if (!token) return '';
  const lower = token.toLowerCase();

  // Tratamento de apóstrofos (ex: d'água, d'Ávila)
  if (lower.startsWith("d'") || lower.startsWith('d’')) {
    const prefix = isFirstInText ? "D'" : "d'";
    const rest = token.slice(2);
    return prefix + (rest ? capitalizeWordToken(rest, false) : '');
  }

  // Preserva acrônimos em maiúsculo (ex: TV, LED, MDF, MDP)
  if (knownAcronyms.has(lower)) {
    return lower.toUpperCase();
  }

  // Mantém preposições/conjunções em minúsculo, exceto no início do texto
  if (!isFirstInText && lowercaseWords.has(lower)) {
    return lower;
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function processHyphenOrWord(chunk: string, isFirstInText: boolean): string {
  if (!chunk.includes('-')) {
    return capitalizeWordToken(chunk, isFirstInText);
  }
  return chunk
    .split('-')
    .map((sub, idx) => capitalizeWordToken(sub, isFirstInText && idx === 0))
    .join('-');
}

export function toTitleCase(str: any): string {
  if (!str || (typeof str !== 'string' && typeof str !== 'number')) return '';
  const text = String(str).trim();
  if (!text) return '';

  return text
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return '';

      // Se contiver '/', trata cada parte preservando a barra (ex: Branco/Off-White)
      if (word.includes('/')) {
        return word
          .split('/')
          .map((slashPart, sIdx) => processHyphenOrWord(slashPart, index === 0 && sIdx === 0))
          .join('/');
      }

      return processHyphenOrWord(word, index === 0);
    })
    .join(' ');
}
