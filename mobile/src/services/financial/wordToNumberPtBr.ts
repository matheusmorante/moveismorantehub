/**
 * Conversor determinístico offline de numerais e expressões por extenso em Português BR.
 * Converte falas como:
 * - "duzentos e trinta e sete reais e oitenta e nove centavos" -> 237.89
 * - "um milhão e meio" -> 1500000
 * - "vinte mil" -> 20000
 * - "dois mil e quinhentos" -> 2500
 */

const wordValueMap: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  três: 3,
  tres: 3,
  trêis: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  cincoenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  duzento: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
};

export function parsePtBrWrittenNumbers(text: string): number | null {
  const lower = text.toLowerCase().trim();

  // 0. Locale de milhar/decimal (ex: 2.500 ou 2.500,00 ou 237,89)
  const localeFormatted = lower.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\b/);
  if (localeFormatted && !lower.includes('mil') && !lower.includes('k')) {
    const rawNum = localeFormatted[1].replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(rawNum);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 0b. Centavos abreviados sem palavra reais/centavos (ex: "237 e 89")
  const shortCentavos = lower.match(/\b(\d+)\s+e\s+(\d{1,2})\b/);
  if (shortCentavos && !lower.includes('mil') && !lower.includes('reais')) {
    return parseInt(shortCentavos[1], 10) + parseInt(shortCentavos[2], 10) / 100;
  }

  // 1. Caso especial de Milhão / Milhões (ex: "um milhão e meio", "um milhão e duzentos mil", "dois milhões e cinquenta mil")
  if (lower.includes('milhão') || lower.includes('milhao') || lower.includes('milhões') || lower.includes('milhoes')) {
    const parts = lower.split(/milhão|milhao|milhões|milhoes/i);
    const leftPart = parts[0].trim() || 'um';
    const rightPart = (parts[1] || '').replace(/^s*e\s*/, '').trim();

    const leftVal = extractNumericWordsVal(leftPart) || 1;
    let rightVal = 0;

    if (rightPart.includes('meio')) {
      rightVal = 500000;
    } else if (rightPart) {
      rightVal = parsePtBrWrittenNumbers(rightPart) || parseSimpleWordsToNumber(rightPart);
    }

    return leftVal * 1000000 + rightVal;
  }

  // 1.5. Caso de inteiros curtos com centavos (ex: "237 e 89", "foi 237 e 89")
  const shortCentsMatch = lower.match(/\b(\d+)\s+e\s+(\d{1,2})\b/i);
  if (shortCentsMatch && !lower.includes('mil') && !lower.includes('reais') && !lower.includes('centavos')) {
    const reais = parseInt(shortCentsMatch[1], 10);
    const centavos = parseInt(shortCentsMatch[2], 10);
    if (reais > 0 && centavos >= 0 && centavos <= 99) {
      return reais + (centavos / 100);
    }
  }

  // 2. Caso de Mil (ex: "cento e vinte mil", "dez mil e cinquenta", "2 mil e 50", "2,5 mil")
  if (lower.includes('mil') && !lower.includes('reais e') && !lower.includes('centavos')) {
    const parts = lower.split(/\bmil\b/i);
    const leftPart = parts[0].trim();
    const rightPart = (parts[1] || '').replace(/^s*e\s*/, '').trim();

    let leftVal = 1;
    if (leftPart) {
      if (leftPart.includes(',')) {
        const commaMatch = leftPart.match(/\b(\d+(?:,\d+)?)\b/);
        leftVal = commaMatch ? parseFloat(commaMatch[1].replace(',', '.')) : 1;
      } else {
        leftVal = extractNumericWordsVal(leftPart) || 1;
      }
    }

    let rightVal = 0;
    if (rightPart) {
      rightVal = extractNumericWordsVal(rightPart) || parseSimpleWordsToNumber(rightPart);
    }

    return Math.round(leftVal * 1000 + rightVal);
  }

  // 3. Processamento de Reais e Centavos escritos por extenso (ex: "duzentos e trinta e sete reais e oitenta e nove centavos")
  const reaisCentavosMatch = lower.match(/(?:([a-zçãéêíóôõú\s\d]+)\s*(?:reais|real))?\s*(?:e\s*)?(?:([a-zçãéêíóôõú\s\d]+)\s*centavos?)?/i);

  if (reaisCentavosMatch && (reaisCentavosMatch[1] || reaisCentavosMatch[2])) {
    const reaisWords = (reaisCentavosMatch[1] || '').trim();
    const centavosWords = (reaisCentavosMatch[2] || '').trim();

    let total = 0;
    if (reaisWords) {
      const d = reaisWords.match(/\b\d+\b/);
      total += d ? parseInt(d[0], 10) : parseSimpleWordsToNumber(reaisWords);
    }
    if (centavosWords) {
      const d = centavosWords.match(/\b\d+\b/);
      total += (d ? parseInt(d[0], 10) : parseSimpleWordsToNumber(centavosWords)) / 100;
    }

    if (total > 0) return total;
  }

  // 4. Fallback simples por palavras encadeadas (ex: "duzentos e trinta e sete")
  const simpleNum = parseSimpleWordsToNumber(lower);
  return simpleNum > 0 ? simpleNum : null;
}

function parseSimpleWordsToNumber(wordsStr: string): number {
  const words = wordsStr.split(/\s+|e\s+/).map(w => w.trim()).filter(Boolean);
  let total = 0;

  for (const w of words) {
    if (wordValueMap[w] !== undefined) {
      total += wordValueMap[w];
    } else if (w === 'mil') {
      total = total === 0 ? 1000 : total * 1000;
    } else if (w === 'milhão' || w === 'milhao') {
      total = total === 0 ? 1000000 : total * 1000000;
    }
  }

  return total;
}

function extractNumericWordsVal(text: string): number {
  const digits = text.match(/\b\d+\b/);
  if (digits) return parseInt(digits[0], 10);

  const tokens = text.split(/\s+/).map(t => t.trim().toLowerCase());
  let numTokens: string[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (wordValueMap[token] !== undefined || token === 'e') {
      numTokens.unshift(token);
    } else if (numTokens.length > 0) {
      break;
    }
  }

  if (numTokens.length === 0) return 0;
  return parseSimpleWordsToNumber(numTokens.join(' '));
}
